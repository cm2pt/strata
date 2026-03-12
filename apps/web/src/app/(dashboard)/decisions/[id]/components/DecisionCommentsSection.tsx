import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canMutate } from "@/lib/api/client";
import { formatDateTime } from "./decision-helpers";
import type { DecisionComment } from "@/lib/types";

export interface DecisionCommentsSectionProps {
  comments: DecisionComment[];
  canApprove: boolean;
  commentText: string;
  commentLoading: boolean;
  onCommentTextChange: (text: string) => void;
  onAddComment: () => void;
}

export function DecisionCommentsSection({
  comments,
  canApprove,
  commentText,
  commentLoading,
  onCommentTextChange,
  onAddComment,
}: DecisionCommentsSectionProps) {
  return (
    <Card>
      <SectionHeader
        title="Comments"
        subtitle={`${comments.length} comments`}
        icon={MessageSquare}
      />

      {comments.length > 0 && (
        <div className="mt-4 space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex-shrink-0">
                {c.userName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {c.userName}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(c.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{c.comment}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Comment form */}
      {canApprove && (
        <div className="mt-4 border-t pt-4">
          <textarea
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => onCommentTextChange(e.target.value)}
            disabled={!canMutate}
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              onClick={onAddComment}
              disabled={!canMutate || !commentText.trim() || commentLoading}
              title={
                !canMutate ? "API unavailable in offline demo mode" : ""
              }
            >
              {commentLoading ? "Posting..." : "Add Comment"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
