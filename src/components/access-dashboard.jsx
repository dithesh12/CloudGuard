
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
import { reauthenticateWithPopup } from "firebase/auth";

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
import { auth, googleProvider } from "@/lib/firebase";


const initialUsers = [];

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;


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

  const [isApiLoaded, setIsApiLoaded] = React.useState(false);
  const [isPickerLoading, setIsPickerLoading] = React.useState(false);
  
  React.useEffect(() => {
    const checkApi = () => {
      if (window.gapi && window.google) {
        window.gapi.load('picker', () => {
          setIsApiLoaded(true);
        });
      } else {
        setTimeout(checkApi, 100);
      }
    };
    checkApi();
  }, []);

  const createPicker = (accessToken) => {
    setIsPickerLoading(false);
    if (!isApiLoaded || !user) {
        toast({ title: "Error", description: "Google Picker API cannot be loaded.", variant: "destructive"});
        return;
    }
    const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
    view.setMimeTypes("image/png,image/jpeg,image/jpg,application/pdf");
    const picker = new window.google.picker.PickerBuilder()
      .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
      .setAppId(APP_ID)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY)
      .setCallback(pickerCallback)
      .build();
    picker.setVisible(true);
  };

  const handleAuthClick = async () => {
    setIsPickerLoading(true);
    if (!user || !auth.currentUser) {
      toast({
        title: 'Not logged in',
        description: 'Please log in to select a file.',
        variant: 'destructive',
      });
      setIsPickerLoading(false);
      return;
    }

    try {
      const result = await reauthenticateWithPopup(auth.currentUser, googleProvider);
      const credential = result.credential;

      if (credential && credential.accessToken) {
        createPicker(credential.accessToken);
      } else {
        setIsPickerLoading(false);
        toast({
          title: 'Authentication Failed',
          description: 'Could not get access token for Google Drive.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setIsPickerLoading(false);
      console.error('Error getting access token:', error);
      toast({
        title: 'Error',
        description: 'Could not get access token for Google Drive. Please try again.',
        variant: 'destructive',
      });
    }
  };


  const pickerCallback = (data) => {
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
    }
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
      // Update existing user
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...userData } : u));
      toast({
        title: "User Updated",
        description: `Access details for ${userData.email.split('@')[0]} have been updated.`,
      });
    } else {
      // Add new user
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
  
  const handleSaveChanges = () => {
    if (!selectedFile) {
       toast({
        title: "No File Selected",
        variant: "destructive",
        description: "Please select a file to save changes.",
      });
      return;
    }
    toast({
      title: "Settings Saved",
      description: `Access control settings for ${selectedFile.name} have been updated.`,
    });
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
               <Button variant="outline" size="sm" onClick={handleAuthClick} disabled={!isApiLoaded || !user || isPickerLoading} className="w-full sm:w-auto">
                {isPickerLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Select from Google Drive
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
                  <Label htmlFor="date-range">Access Duration</Label>
                  <Popover open={isCalendarOpen} onOpenChange={handleCalendarOpenChange}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-range"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                        disabled={!selectedFile}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                          date.to ? (
                            <>
                              {format(date.from, "LLL dd, y")} -{" "}
                              {format(date.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(date.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start" side="bottom">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={handleDateSelect}
                        numberOfMonths={1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Time Window (Optional)</Label>
                  <div className="flex items-center gap-2">
                     <Clock className="h-5 w-5 text-muted-foreground" />
                     <TimePicker value={startTime} onChange={setStartTime} disabled={!selectedFile} />
                    <span className="text-muted-foreground">-</span>
                    <TimePicker value={endTime} onChange={setEndTime} disabled={!selectedFile} />
                  </div>
                </div>
                 <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="view-limit">View Limit (Optional)</Label>
                  <div className="relative">
                    <Eye className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input id="view-limit" type="number" placeholder="e.g., 10 views" className="pl-10" disabled={!selectedFile} />
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
          <Button variant="ghost" onClick={handleReset} disabled={!selectedFile} className="w-full sm:w-auto">
             <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSaveChanges} disabled={!selectedFile} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
