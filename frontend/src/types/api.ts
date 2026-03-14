export interface TokenPair {
  access: string;
  refresh: string;
}

export interface Upload {
  id: string;
  status: "pending_payment" | "pending" | "validating" | "processing" | "completed" | "failed";
  original_filename: string;
  file_size_bytes: number;
  progress_pct: number;
  error_message: string;
  created_at: string;
  checkout_url?: string;
}

export interface UploadStatus {
  id: string;
  status: Upload["status"];
  progress_pct: number;
  error_message: string;
  dashboard_id: string | null;
  checkout_url: string | null;
}

export interface UserProfile {
  username: string;
  email: string;
  display_name: string;
  timezone: string;
  max_uploads: number;
  has_paid: boolean;
  upload_count: number;
  created_at: string;
}

export interface Payment {
  id: string;
  amount_cents: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  stripe_payment_intent_id: string;
  receipt_url: string;
  created_at: string;
}
