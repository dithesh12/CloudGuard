
"use client";

import * as React from "react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  Eye,
  FileText,
  Save,
  UserPlus,
  RotateCcw,
  Unplug,
  ShieldCheck,
  Link as LinkIcon,
  Loader2,
  Copy,
  EyeOff,
  HelpCircle,
} from "lucide-react";

import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Calendar } from "./ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Separator } from "./ui/separator";
import { UserAccessTable } from "./user-access-table";
import { AddUserDialog } from "./add-user-dialog";
import { useToast } from "../hooks/use-toast";
import { TimePicker } from "./time-picker";
import { OAUTH_CLIENT_ID, API_KEY } from "@/lib/firebase";
import { setAccessRule } from "@/ai/flows/set-access-rule-flow";
import { auth } from "@/lib/firebase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const initialUsers = [];

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';
const APP_ID = OAUTH_CLIENT_ID.split('-')[0];

export default function AccessDashboard({ user }) {
  const { toast } = useToast();
  const [dateRange, setDateRange] = React.useState({ from: null, to: null });
  const [startTime, setStartTime] = React.useState('09:00');
  const [endTime, setEndTime] = React.useState('17:00');
  const [viewLimit, setViewLimit] = React.useState(1);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [users, setUsers] = React.useState(() => initialUsers.map((u, i) => ({...u, id: `user-${i+1}`})));
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [editingUser, setEditingUser] = React.useState(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = React.useState(false);

  const [gapiLoaded, setGapiLoaded] = React.useState(false);
  const [gisLoaded, setGisLoaded] = React.useState(false);
  const [pickerApiLoaded, setPickerApiLoaded] = React.useState(false);
  const [isPickerLoading, setIsPickerLoading] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedLink, setGeneratedLink] = React.useState(null);
  const [tokenClient, setTokenClient] = React.useState(null);
  
  const isDriveReady = gapiLoaded && gisLoaded && pickerApiLoaded;
  
  const createPicker = React.useCallback((tokenResponse) => {
    if (tokenResponse.access_token && window.google?.picker) {
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(tokenResponse.access_token)
        .setDeveloperKey(API_KEY)
        .setAppId(APP_ID)
        .setCallback((data) => {
           setIsPickerLoading(false);
           if (data.action === window.google.picker.Action.PICKED) {
             const file = data.docs[0];
             setSelectedFile({
               name: file.name,
               url: file.url,
               id: file.id,
             });
             setGeneratedLink(null);
              toast({
               title: "File Selected",
               description: `Now managing access for ${file.name}.`,
             });
           } else if (data.action === window.google.picker.Action.CANCEL) {
              toast({
               title: "Selection Cancelled",
               description: `You can select a file at any time.`,
               variant: "default"
             });
           }
        })
        .build();
      picker.setVisible(true);
    } else {
       setIsPickerLoading(false);
       toast({ title: 'Authentication Error', description: 'Failed to get access token or picker not ready.', variant: 'destructive'});
    }
  }, [toast]);


  React.useEffect(() => {
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      window.gapi.load('picker', () => setPickerApiLoaded(true));
      setGapiLoaded(true);
    }
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => setGisLoaded(true);
    document.body.appendChild(gisScript);
    
    return () => {
      document.body.removeChild(gapiScript);
      document.body.removeChild(gisScript);
    }
  }, []);

  React.useEffect(() => {
    if (gisLoaded) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: OAUTH_CLIENT_ID,
        scope: SCOPES,
        callback: createPicker,
      });
      setTokenClient(client);
    }
  }, [gisLoaded, createPicker]);


  const handleAuthClick = async () => {
    if (!isDriveReady || !tokenClient) {
      toast({ title: 'Error', description: 'Picker API is not loaded yet. Please wait a moment and try again.', variant: 'destructive'});
      return;
    }
    setIsPickerLoading(true);
    tokenClient.requestAccessToken({prompt: 'consent'});
  };

  const handleDateSelect = (selectedRange) => {
    setDateRange(selectedRange);
    setIsCalendarOpen(false);
  };
  
  const handleCalendarOpenChange = (open) => {
    setIsCalendarOpen(open);
  };

  const handleDisconnect = () => {
    setSelectedFile(null);
    setGeneratedLink(null);
    toast({
      title: "File Disconnected",
      description: "Select a new file to manage its access.",
    });
  };

  const handleSaveUser = (userData) => {
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...userData } : u));
      toast({
        title: "User Updated",
        description: `Access details for ${userData.email} have been updated.`,
      });
    } else {
      const userToAdd = {
        ...userData,
        id: `user-${Date.now()}`,
      };
      setUsers([...users, userToAdd]);
      toast({
        title: "User Added",
        description: `${userData.email} has been granted temporary access.`,
      });
    }
    setEditingUser(null);
    setIsUserDialogOpen(false);
    setGeneratedLink(null);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsUserDialogOpen(true);
  };

  const handleAddNewUserClick = () => {
    setEditingUser(null);
    setIsUserDialogOpen(true);
  };

  const handleRemoveUser = (userId) => {
    setUsers(users.filter(user => user.id !== userId));
     toast({
      title: "User Removed",
      variant: "destructive",
      description: `Access has been revoked. Remember to generate a new link.`,
    });
    setGeneratedLink(null);
  };
  
  const handleGenerateLink = async () => {
    if (!selectedFile) {
       toast({
        title: "No File Selected",
        variant: "destructive",
        description: "Please select a file to generate a link.",
      });
      return;
    }

    if (!user) {
       toast({
        title: "Authentication Error",
        variant: "destructive",
        description: "You must be logged in to save changes.",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedLink(null);
    
    try {
      const idToken = await auth.currentUser.getIdToken();
      
      let expiryTimestamp;
      if (dateRange?.to) {
        const [hours, minutes] = endTime.split(':');
        const finalDate = new Date(dateRange.to);
        finalDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        expiryTimestamp = finalDate.getTime();
      }
      
      const allowedUsers = users.map(u => u.email);

      await setAccessRule({
        fileId: selectedFile.id,
        ownerId: user.uid,
        allowedUsers,
        viewLimit: Number(viewLimit),
        expiryTimestamp: expiryTimestamp,
        idToken: idToken,
      });

      const secureLink = `${window.location.origin}/view/${selectedFile.id}`;
      setGeneratedLink(secureLink);

      toast({
        title: "Secure Link Generated",
        description: `Permissions have been saved. Share the new link.`,
      });
    } catch (error) {
       console.error("Failed to save changes:", error);
       toast({
        title: "Generation Failed",
        variant: "destructive",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (generatedLink) {
        navigator.clipboard.writeText(generatedLink);
        toast({ title: "Link Copied!", description: "The secure link has been copied to your clipboard." });
    }
  };
  
  const handleReset = () => {
    setUsers([]);
    setDateRange({ from: null, to: null });
    setStartTime('09:00');
    setEndTime('17:00');
    setViewLimit(1);
    setGeneratedLink(null);
    toast({
      title: "Settings Reset",
      description: "All access settings have been reset to their defaults.",
    });
  };

  return (
    <div className="container mx-auto p-0">
      <Card className="w-full max-w-3xl mx-auto shadow-lg rounded-xl bg-card/50 backdrop-blur-sm border-border/20">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl sm:text-3xl">
                Create a Secure Link
              </CardTitle>
            </div>
            <CardDescription>
              Select a file, add users, set rules, and generate a secure, temporary link.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {/* Step 1: Select File */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">1</div>
                    <h3 className="text-xl font-semibold">Select a File</h3>
                </div>
                {selectedFile ? (
                    <div className="flex items-center justify-between p-3 pl-4 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <FileText className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate text-base">{selectedFile.name}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDisconnect}>
                            <Unplug className="mr-2 h-4 w-4" /> Change File
                        </Button>
                    </div>
                ) : (
                    <Button variant="outline" onClick={handleAuthClick} disabled={!isDriveReady || isPickerLoading} className="w-full py-6 text-base">
                        {isPickerLoading || !isDriveReady ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                        <LinkIcon className="mr-2 h-5 w-5" />
                        )}
                        {!isDriveReady ? 'Initializing Google Drive...' : 'Select a File from Google Drive'}
                    </Button>
                )}
            </div>

            <Separator />

            {/* Step 2: Add Users & Rules */}
            <div className={cn("space-y-6", !selectedFile && "opacity-50 pointer-events-none")}>
                 <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">2</div>
                    <h3 className="text-xl font-semibold">Set Access Rules</h3>
                </div>
                
                <div className="space-y-2">
                    <Label>Access Timeframe</Label>
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                        <Popover open={isCalendarOpen} onOpenChange={handleCalendarOpenChange}>
                            <PopoverTrigger asChild>
                              <Button
                                id="date"
                                variant={"outline"}
                                className={cn( "w-full justify-start text-left font-normal h-11", !dateRange?.from && "text-muted-foreground"
                                )}
                                disabled={!selectedFile}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                  dateRange.to ? (
                                    <>
                                      {format(dateRange.from, "MMM d, yyyy")} -{" "}
                                      {format(dateRange.to, "MMM d, yyyy")}
                                    </>
                                  ) : (
                                    format(dateRange.from, "MMM d, yyyy")
                                  )
                                ) : (
                                  <span>Pick a date range</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={handleDateSelect}
                                numberOfMonths={2}
                                disabled={(day) => day < new Date(new Date().setDate(new Date().getDate() - 1))}
                              />
                            </PopoverContent>
                        </Popover>
                        <div className="flex items-center gap-2">
                            <TimePicker value={startTime} onChange={(val) => {setStartTime(val); setGeneratedLink(null);}} disabled={!selectedFile || !dateRange?.from} />
                            <span className="text-muted-foreground">-</span>
                            <TimePicker value={endTime} onChange={(val) => {setEndTime(val); setGeneratedLink(null);}} disabled={!selectedFile || !dateRange?.from} />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Authorized Users</Label>
                    <Button variant="outline" size="sm" disabled={!selectedFile} onClick={handleAddNewUserClick}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add User
                    </Button>
                  </div>
                  <UserAccessTable users={users} onRemoveUser={handleRemoveUser} onEditUser={handleEditUser} />
                   <AddUserDialog 
                      isOpen={isUserDialogOpen}
                      setIsOpen={setIsUserDialogOpen}
                      onSave={handleSaveUser}
                      editingUser={editingUser}
                      setEditingUser={setEditingUser}
                  />
                </div>
                 <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="view-limit">View Limit</Label>
                    </div>
                    <Input id="view-limit" type="number" placeholder="e.g., 5" value={viewLimit} onChange={(e) => setViewLimit(e.target.value)} disabled={!selectedFile} className="w-full" min="1" />
                </div>

            </div>

            <Separator />
            
            {/* Step 3: Generate Link */}
            <div className={cn("space-y-4 text-center", !selectedFile && "opacity-50 pointer-events-none")}>
                <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">3</div>
                    <h3 className="text-xl font-semibold">Generate Your Secure Link</h3>
                </div>

                 <Button 
                    onClick={handleGenerateLink} 
                    disabled={!selectedFile || isGenerating || users.length === 0} 
                    className="w-full sm:w-auto"
                    size="lg"
                  >
                    {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    {isGenerating ? 'Applying Rules...' : 'Generate Secure Link'}
                  </Button>
                  
                  {generatedLink && (
                    <div className="mt-6 p-4 border-dashed border-2 border-primary rounded-lg bg-primary/10">
                        <Label className="text-sm font-bold text-primary">Your Secure Link is Ready!</Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input value={generatedLink} readOnly className="bg-background text-base" />
                            <Button size="icon" variant="outline" onClick={handleCopyToClipboard}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Only the users you added can access this link until the expiration time.</p>
                    </div>
                  )}

            </div>
          
        </CardContent>
        <CardFooter className="flex justify-end items-center pt-6 border-t mt-4">
           <Button variant="ghost" onClick={handleReset} disabled={isGenerating}>
             <RotateCcw className="mr-2 h-4 w-4" />
            Reset All
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
