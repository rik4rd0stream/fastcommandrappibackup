CREATE TABLE public.fcm_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert tokens"
ON public.fcm_tokens
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read tokens"
ON public.fcm_tokens
FOR SELECT
USING (true);

CREATE POLICY "Anyone can update tokens"
ON public.fcm_tokens
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete tokens"
ON public.fcm_tokens
FOR DELETE
USING (true);