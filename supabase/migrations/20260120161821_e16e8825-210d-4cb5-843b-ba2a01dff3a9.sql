-- Create expense_requests table
CREATE TABLE public.expense_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recurring_payments table
CREATE TABLE public.recurring_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  day_of_month INTEGER,
  day_of_week TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense_requests
CREATE POLICY "Users can view their own expenses"
  ON public.expense_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses"
  ON public.expense_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON public.expense_requests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.expense_requests FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for recurring_payments
CREATE POLICY "Users can view their own payments"
  ON public.recurring_payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments"
  ON public.recurring_payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments"
  ON public.recurring_payments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payments"
  ON public.recurring_payments FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

-- Storage policies for receipts bucket
CREATE POLICY "Users can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

CREATE POLICY "Users can delete their own receipts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_expense_requests_updated_at
  BEFORE UPDATE ON public.expense_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_payments_updated_at
  BEFORE UPDATE ON public.recurring_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();