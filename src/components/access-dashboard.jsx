
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

const initialUsers = [
  {
    name: "Test User",
    email: "test@example.com",
    avatar: `https://placehold.co/40x40.png`,
    accessLevel: "Viewer",
    priority: 1,
  },
];

const SCOPES = 'https://www.googleapis.com/auth/drive';
const APP_ID = OAUTH_CLIENT_ID.split('-')[0];

export default function AccessDashboard({ user }) {
  const { toast } = useToast();
  const [date, setDate] = React.useState();
  const [startTime, setStartTime] = React.useState('09');
  const [endTime, setEndTime] = React.useState('17');
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [users, setUsers] = React.useState(() => initialUsers.map((u, i) => ({...u, id: `user-${i+1}`})));
  const [selectedFile, setSelectedFile] = React.useState(null);
  const [editingUser, setEditingUser] = React.useState(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = React.useState(false);

  const [gapiLoaded, setGapiLoaded] = React.useState(false);
  const [gisLoaded, setGisLoaded] = React.useState(false);
  const [pickerApiLoaded, setPickerApiLoaded] = React.useState(false);
  const [isPickerLoading, setIsPickerLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
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
      setGapiLoaded(true);
      window.gapi.load('picker', () => setPickerApiLoaded(true));
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
    if (selectedDate?.from && selectedDate?.to) {
      setIsCalendarOpen(false);
    }
  };
  
  const handleCalendarOpenChange = (open) => {
    if (open) {
      window.scrollBy({ top: 300, behavior: 'smooth' });
    }
    setIsCalendarOpen(open);
  };

  const handleDisconnect = () => {
    setSelectedFile(null);
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
        description: `${userToAdd.name} has been granted access.`,
      });
    }
    setEditingUser(null);
    setIsUserDialogOpen(false);
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
      description: `Access has been revoked.`,
    });
  };
  
  const handleSaveChanges = async () => {
    if (!selectedFile) {
       toast({
        title: "No File Selected",
        variant: "destructive",
        description: "Please select a file to save changes.",
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

    setIsSaving(true);
    
    try {
      const idToken = await auth.currentUser.getIdToken();
      const expirationDate = date?.to ? date.to.toISOString() : undefined;
      
      const permissionsToSet = users.map(u => ({
        email: u.email,
        role: u.accessLevel, // Pass the UI role directly e.g. "Editor"
      }));

      await updatePermissions({
        fileId: selectedFile.id,
        permissions: permissionsToSet,
        expirationDate: expirationDate,
        idToken: idToken,
      });

      toast({
        title: "Settings Saved",
        description: `Access control settings for ${selectedFile.name} have been updated.`,
      });
    } catch (error) {
       console.error("Failed to save changes:", error);
       toast({
        title: "Save Failed",
        variant: "destructive",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleReset = () => {
    setUsers(initialUsers.map((u, i) => ({...u, id: `user-${i+1}`})));
    setDate(null);
    setStartTime('09');
    setEndTime('17');
    document.getElementById('view-limit').value = '';
    toast({
      title: "Settings Reset",
      description: "All access settings have been reset to their defaults.",
    });
  };

  return (
    <div className="container mx-auto p-0">
      <Card className="w-full max-w-4xl mx-auto shadow-lg rounded-xl bg-card/50 backdrop-blur-sm border-border/20">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="h-6 w-6 text-muted-foreground" />
              <CardTitle className="text-xl">
                {selectedFile ? selectedFile.name : "No file selected"}
              </CardTitle>
            </div>
            {selectedFile ? (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                   <a href={selectedFile.url} target="_blank" rel="noopener noreferrer">
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Open File
                  </a>
                 </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect} className="w-full sm:w-auto">
                  <Unplug className="mr-2 h-4 w-4" />
                  Disconnect File
                </Button>
              </div>
            ) : (
               <Button variant="outline" size="sm" onClick={handleAuthClick} disabled={!isDriveReady || isPickerLoading} className="w-full sm:w-auto">
                {isPickerLoading || !isDriveReady ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                {!isDriveReady ? 'Initializing...' : 'Select from Google Drive'}
              </Button>
            )}
          </div>
          <CardDescription>
            {selectedFile 
              ? `Manage who can access ${selectedFile.name} and set access rules.`
              : "Select a file from your Google Drive to manage its access."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-4">Global Access Rules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="date-range">Access Expiration</Label>
                  <Popover open={isCalendarOpen} onOpenChange={handleCalendarOpenChange}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-range"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date?.to && "text-muted-foreground"
                        )}
                        disabled={!selectedFile}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.to ? (
                          format(date.to, "LLL dd, y")
                        ) : (
                          <span>Pick an expiration date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" side="bottom">
                      <Calendar
                        initialFocus
                        mode="single"
                        selected={date?.to}
                        onSelect={(day) => setDate({ from: date?.from, to: day })}
                        numberOfMonths={1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Time Window (Optional - Not Implemented)</Label>
                  <div className="flex items-center gap-2">
                     <Clock className="h-5 w-5 text-muted-foreground" />
                     <TimePicker value={startTime} onChange={setStartTime} disabled={true} />
                    <span className="text-muted-foreground">-</span>
                    <TimePicker value={endTime} onChange={setEndTime} disabled={true} />
                  </div>
                </div>
                 <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="view-limit">View Limit (Optional - Not Implemented)</Label>
                  <div className="relative">
                    <Eye className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="view-limit" type="number" placeholder="e.g., 10 views" className="pl-10" disabled={true} />
                  </div>
                </div>
              </div>
            </div>

            <Separator />
            
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <h3 className="text-lg font-medium">User-specific Access</h3>
                <AddUserDialog 
                  isOpen={isUserDialogOpen}
                  setIsOpen={setIsUserDialogOpen}
                  onSave={handleSaveUser}
                  editingUser={editingUser}
                  setEditingUser={setEditingUser}
                >
                  <Button variant="outline" disabled={!selectedFile} onClick={handleAddNewUserClick} className="w-full sm:w-auto">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                  </Button>
                </AddUserDialog>
              </div>
              <UserAccessTable users={users} onRemoveUser={handleRemoveUser} onEditUser={handleEditUser} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-6">
          <Button variant="ghost" onClick={handleReset} disabled={!selectedFile || isSaving} className="w-full sm:w-auto">
             <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSaveChanges} disabled={!selectedFile || isSaving} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
