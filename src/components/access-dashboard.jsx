
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
import { updatePermissions } from "@/ai/flows/update-permissions-flow";
import { auth } from "@/lib/firebase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const initialUsers = [
  {
    name: "Test User",
    email: "test@example.com",
    avatar: `https://placehold.co/40x40.png`,
    accessLevel: "Viewer",
  },
];

const SCOPES = 'https://www.googleapis.com/auth/drive';
const APP_ID = OAUTH_CLIENT_ID.split('-')[0];

export default function AccessDashboard({ user }) {
  const { toast } = useToast();
  const [date, setDate] = React.useState();
  const [endTime, setEndTime] = React.useState('17:00');
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
    return () => document.body.removeChild(gapiScript);
  }, []);

  React.useEffect(() => {
    if (!gapiLoaded) return;
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      setGisLoaded(true);
      if (window.google?.accounts?.oauth2) {
        setTokenClient(window.google.accounts.oauth2.initTokenClient({
          client_id: OAUTH_CLIENT_ID,
          scope: SCOPES,
          callback: createPicker,
        }));
      }
    };
    document.body.appendChild(gisScript);
    return () => document.body.removeChild(gisScript);
  }, [gapiLoaded, createPicker]);

  const handleAuthClick = async () => {
    if (!isDriveReady || !tokenClient) {
      toast({ title: 'Error', description: 'Picker API is not loaded yet. Please wait a moment and try again.', variant: 'destructive'});
      return;
    }
    setIsPickerLoading(true);
    tokenClient.requestAccessToken({prompt: 'consent'});
  };

  const handleDateSelect = (selectedDate) => {
    setDate(selectedDate);
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
        description: `Access details for ${userData.email.split('@')[0]} have been updated.`,
      });
    } else {
      const userToAdd = {
        ...userData,
        id: `user-${Date.now()}`,
        name: userData.email.split('@')[0],
        avatar: `https://placehold.co/40x40.png`,
      };
      setUsers([...users, userToAdd]);
      toast({
        title: "User Added",
        description: `${userToAdd.name} has been granted temporary access.`,
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
      
      let expirationDate;
      if (date) {
        const [hours, minutes] = endTime.split(':');
        const finalDate = new Date(date);
        finalDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        expirationDate = finalDate.toISOString();
      }
      
      const permissionsToSet = users.map(u => ({
        email: u.email,
        role: u.accessLevel,
      }));

      await updatePermissions({
        fileId: selectedFile.id,
        permissions: permissionsToSet,
        expirationDate: expirationDate,
        idToken: idToken,
      });

      // In a real app, this would be a unique, secure URL from your backend.
      // For now, we use the direct file URL as a placeholder.
      setGeneratedLink(selectedFile.url);

      toast({
        title: "Secure Link Generated",
        description: `Permissions have been applied to ${selectedFile.name}.`,
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
    navigator.clipboard.writeText(generatedLink);
    toast({ title: "Link Copied!", description: "The secure link has been copied to your clipboard." });
  };
  
  const handleReset = () => {
    setUsers(initialUsers.map((u, i) => ({...u, id: `user-${i+1}`})));
    setDate(null);
    setEndTime('17:00');
    setGeneratedLink(null);
    toast({
      title: "Settings Reset",
      description: "All access settings have been reset to their defaults.",
    });
  };

  return (
    <div className="container mx-auto p-0">
      <Card className="w-full max-w-2xl mx-auto shadow-lg rounded-xl bg-card/50 backdrop-blur-sm border-border/20">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl sm:text-3xl">
                Create a Secure Link
              </CardTitle>
            </div>
            <CardDescription>
              Select a file, add users, and generate a secure, temporary link.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {/* Step 1: Select File */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">1</div>
                    <h3 className="text-lg font-medium">Select a File from Google Drive</h3>
                </div>
                {selectedFile ? (
                    <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate">{selectedFile.name}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleDisconnect}>
                            <Unplug className="mr-2 h-4 w-4" /> Change
                        </Button>
                    </div>
                ) : (
                    <Button variant="outline" onClick={handleAuthClick} disabled={!isDriveReady || isPickerLoading} className="w-full">
                        {isPickerLoading || !isDriveReady ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                        <LinkIcon className="mr-2 h-4 w-4" />
                        )}
                        {!isDriveReady ? 'Initializing...' : 'Select File'}
                    </Button>
                )}
            </div>

            <Separator />

            {/* Step 2: Add Users & Rules */}
            <div className={cn("space-y-4", !selectedFile && "opacity-50 pointer-events-none")}>
                 <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">2</div>
                    <h3 className="text-lg font-medium">Add Users & Set Rules</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Access Expires On</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Popover open={isCalendarOpen} onOpenChange={handleCalendarOpenChange}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn( "w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                            disabled={!selectedFile}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "LLL dd, y") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            numberOfMonths={1}
                            disabled={(day) => day < new Date(new Date().setHours(0,0,0,0))}
                          />
                        </PopoverContent>
                      </Popover>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <TimePicker value={endTime} onChange={(val) => {setEndTime(val); setGeneratedLink(null);}} disabled={!selectedFile || !date} />
                      </div>
                    </div>
                  </div>

                   <div className="space-y-2">
                      <Label>View Limit</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="w-full text-left">
                              <div className="flex items-center gap-2">
                                <EyeOff className="h-5 w-5 text-muted-foreground" />
                                <Input value="Unlimited" disabled className="cursor-not-allowed"/>
                              </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View limits are not supported by the Google Drive API.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                </div>

                <div>
                    <Label className="mb-2 block">Authorized Users</Label>
                    <UserAccessTable users={users} onRemoveUser={handleRemoveUser} onEditUser={handleEditUser} />
                     <AddUserDialog 
                        isOpen={isUserDialogOpen}
                        setIsOpen={setIsUserDialogOpen}
                        onSave={handleSaveUser}
                        editingUser={editingUser}
                        setEditingUser={setEditingUser}
                        >
                        <Button variant="outline" disabled={!selectedFile} onClick={handleAddNewUserClick} className="w-full mt-2">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add User
                        </Button>
                    </AddUserDialog>
                </div>
            </div>

            <Separator />
            
            {/* Step 3: Generate Link */}
            <div className={cn("space-y-4 text-center", !selectedFile && "opacity-50 pointer-events-none")}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">3</div>
                    <h3 className="text-lg font-medium">Generate Link</h3>
                </div>

                 <Button 
                    onClick={handleGenerateLink} 
                    disabled={!selectedFile || isGenerating} 
                    className="w-full sm:w-auto"
                    size="lg"
                  >
                    {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isGenerating ? 'Applying Permissions...' : 'Generate Secure Link'}
                  </Button>
                  
                  {generatedLink && (
                    <div className="mt-4 p-4 border-dashed border-2 border-primary rounded-lg bg-primary/10">
                        <Label className="text-sm font-bold text-primary-foreground">Your Secure Link is Ready!</Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input value={generatedLink} readOnly className="bg-background" />
                            <Button size="icon" variant="outline" onClick={handleCopyToClipboard}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Only the users you added can access this link until the expiration time.</p>
                    </div>
                  )}

            </div>
          
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
          <Button variant="ghost" onClick={handleReset} disabled={isGenerating} className="w-full sm:w-auto">
             <RotateCcw className="mr-2 h-4 w-4" />
            Reset All
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
