"use client";

import { Star, MessageSquareText, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-7 h-7 text-yellow-500" />
          Reviews &amp; Reputation
        </h1>
        <p className="text-muted-foreground mt-1">
          Request reviews from customers after purchase. Sparky sends SMS
          conversations, captures ratings, and routes positive reviews to public
          platforms.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Requests Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Responses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquareText className="w-5 h-5" />
            SMS Review Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Coming soon. Once AWS SNS is wired up and templates are authored,
            this page will show per-request conversation transcripts, automatic
            star ratings, and controls for the review settings.
          </p>
          <div className="flex items-center gap-2 pt-2 text-foreground">
            <Settings2 className="w-4 h-4" />
            Ask Sparky: <em>&quot;show me unanswered reviews&quot;</em>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
