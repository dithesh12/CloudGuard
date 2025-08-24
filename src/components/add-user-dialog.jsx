
"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { UserPlus, Edit } from "lucide-react";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  accessLevel: z.enum(["Viewer", "Commenter", "Editor"]),
});

export function AddUserDialog({ children, onSave, isOpen, setIsOpen, editingUser, setEditingUser }) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      accessLevel: "Viewer",
    },
  });

  useEffect(() => {
    if (editingUser) {
      form.reset(editingUser);
    } else {
      form.reset({
        email: "",
        accessLevel: "Viewer",
      });
    }
  }, [editingUser, form, isOpen]);
  
  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setEditingUser(null);
    }
  }

  function onSubmit(values) {
    onSave(values);
  }

  const isEditing = !!editingUser;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit User' : 'Add User'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details for this user.' : 'Invite a user and set their access level.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="teammate@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accessLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Viewer">Viewer</SelectItem>
                      <SelectItem value="Commenter">Commenter</SelectItem>
                      <SelectItem value="Editor">Editor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <Button type="submit">
                  {isEditing ? (
                    <>
                      <Edit className="mr-2 h-4 w-4" /> Save Changes
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" /> Add User
                    </>
                  )}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
