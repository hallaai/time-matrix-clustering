"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Textarea } from "@/components/ui/textarea";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";


const WorksFormSchema = z.object({
  worksData: z.string().min(2, {
    message: "Please upload a Works JSON file.",
  }),
});

type WorksFormValues = z.infer<typeof WorksFormSchema>;

interface ClusterFormProps {
  onWorksDataChange: (works: any[] | null, error?: string) => void;
}

export function ClusterForm({ onWorksDataChange }: ClusterFormProps) {
  const [worksDataString, setWorksDataString] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<WorksFormValues>({
    resolver: zodResolver(WorksFormSchema),
    defaultValues: {
      worksData: '',
    },
  });

  const handleWorksDataChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const worksString = event.target.value;
    setWorksDataString(worksString);
    try {
      const worksData = JSON.parse(worksString);
      if (Array.isArray(worksData?.works)) {
        onWorksDataChange(worksData.works, undefined);
        toast({ title: "Works Data Loaded", description: `Successfully parsed works data. Contains ${worksData.works.length} works.`, variant: "default" });
      } else {
        onWorksDataChange(null, "Invalid works data format: 'works' array not found.");
        toast({ title: "Works Data Error", description: "Invalid works data format: 'works' array not found.", variant: "destructive" });
      }
    } catch (error: any) {
      onWorksDataChange(null, "Failed to parse works JSON. Ensure it's valid JSON.");
      toast({ title: "Works Data Error", description: "Failed to parse works JSON. Ensure it's valid JSON.", variant: "destructive" });
    }
  };


  async function onSubmit(values: WorksFormValues) {
    try {
      const worksData = JSON.parse(values.worksData);
      if (Array.isArray(worksData?.works)) {
        onWorksDataChange(worksData.works, undefined);
        toast({ title: "Works Data Loaded", description: `Successfully parsed works data. Contains ${worksData.works.length} works.`, variant: "default" });
      } else {
        onWorksDataChange(null, "Invalid works data format: 'works' array not found.");
        toast({ title: "Works Data Error", description: "Invalid works data format: 'works' array not found.", variant: "destructive" });
      }
    } catch (error: any) {
      onWorksDataChange(null, "Failed to parse works JSON. Ensure it's valid JSON.");
      toast({ title: "Works Data Error", description: "Failed to parse works JSON. Ensure it's valid JSON.", variant: "destructive" });
    }
  }

  return (
    <Card className={cn("w-full max-w-lg shadow-lg")}>
      <CardHeader>
        {/* Removed CardTitle and CardDescription */}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="worksData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="worksData">Works Data (JSON)</FormLabel>
                  <FormControl>
                    <Textarea
                      id="worksData"
                      placeholder="Paste works data JSON here"
                      className="text-foreground"
                      onChange={handleWorksDataChange}
                    />
                  </FormControl>
                  {worksDataString && <p className="text-sm text-muted-foreground mt-1">Data Loaded</p>}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Load Works Data
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
