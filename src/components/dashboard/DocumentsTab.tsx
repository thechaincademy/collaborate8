import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Upload, Loader2, FolderOpen } from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

interface SharedDocument {
  id: string;
  sender_id: string;
  created_at: string;
  attachment_path: string;
  attachment_name: string;
}

const DocumentsTab = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const coparentId = profile?.coparent_id ?? null;

  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("messages")
      .select("id, sender_id, created_at, attachment_path, attachment_name")
      .not("attachment_path", "is", null)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error("Could not load documents");
    else setDocuments((data ?? []) as SharedDocument[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user || !coparentId) {
      setLoading(false);
      return;
    }
    void loadDocuments();
  }, [user, coparentId, loadDocuments]);

  const openDocument = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(path, 60 * 5);
    if (error || !data?.signedUrl) {
      toast.error("Could not open that file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleUpload = async (file: File) => {
    if (!user || !coparentId || uploading) return;
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${user.id}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file, { upsert: false });
    if (uploadError) {
      setUploading(false);
      toast.error("Could not upload that file");
      return;
    }
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: coparentId,
      body: `Sent a document: ${file.name}`,
      attachment_path: path,
      attachment_name: file.name,
    });
    setUploading(false);
    if (error) {
      toast.error("Could not share that document");
      return;
    }
    toast.success("Document shared with your co-parent");
    void loadDocuments();
  };

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader title="Documents" />
      <p className="mb-4 text-sm text-muted-foreground">
        Upload and share documents with your co-parent - receipts, letters and paperwork, all in one place.
      </p>

      {!profileLoading && !coparentId ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <FolderOpen className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Link with your co-parent first to share documents. You can do this from Settings.
          </p>
        </div>
      ) : (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 10 * 1024 * 1024) {
                toast.error("Files must be under 10MB");
                return;
              }
              if (f) void handleUpload(f);
              e.target.value = "";
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mb-4 w-full"
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Uploading…" : "Upload a document"}
          </Button>

          <div className="flex-1 space-y-2 overflow-y-auto pb-4">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <FolderOpen className="mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No documents yet. Upload your first one above.
                </p>
              </div>
            ) : (
              documents.map((d) => (
                <button
                  key={d.id}
                  onClick={() => openDocument(d.attachment_path)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {d.attachment_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {d.sender_id === user?.id ? "Shared by you" : "Shared by your co-parent"} ·{" "}
                      {new Date(d.created_at).toLocaleString([], {
                        day: "2-digit",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentsTab;
