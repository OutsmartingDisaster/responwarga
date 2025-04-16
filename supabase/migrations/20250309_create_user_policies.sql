-- Create user_policies table
CREATE TABLE IF NOT EXISTS user_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE
);

-- Add RLS policies
ALTER TABLE user_policies ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (anyone can read active policies)
CREATE POLICY "Public can view active policies" 
  ON user_policies 
  FOR SELECT 
  USING (is_active = TRUE);

-- Policy for admin write access (only authenticated users can create/update)
CREATE POLICY "Authenticated users can create policies" 
  ON user_policies 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update policies" 
  ON user_policies 
  FOR UPDATE 
  TO authenticated 
  USING (TRUE) 
  WITH CHECK (TRUE);

-- Insert a default policy
INSERT INTO user_policies (title, content, is_active)
VALUES (
  'Kebijakan Pengguna',
  '<h2>Kebijakan Pengguna Respon Warga</h2>
  <p>Selamat datang di aplikasi Respon Warga. Dengan menggunakan aplikasi ini, Anda menyetujui kebijakan pengguna berikut:</p>
  
  <h3>1. Penggunaan Aplikasi</h3>
  <p>Aplikasi Respon Warga adalah platform untuk membantu koordinasi bantuan dan pelaporan keadaan darurat. Pengguna diharapkan untuk memberikan informasi yang akurat dan jujur.</p>
  
  <h3>2. Tanggung Jawab Pengguna</h3>
  <p>Pengguna bertanggung jawab atas kebenaran informasi yang diberikan. Penyalahgunaan aplikasi untuk menyebarkan informasi palsu dapat dikenakan sanksi hukum.</p>
  
  <h3>3. Privasi Data</h3>
  <p>Kami menghargai privasi Anda. Data pribadi hanya akan ditampilkan jika Anda memberikan izin. Namun, lokasi dan informasi bantuan akan ditampilkan di peta publik.</p>
  
  <h3>4. Keamanan</h3>
  <p>Meskipun kami berusaha menjaga keamanan aplikasi, kami tidak dapat menjamin keamanan 100%. Gunakan aplikasi dengan bijak dan jangan bagikan informasi sensitif yang tidak perlu.</p>
  
  <h3>5. Perubahan Kebijakan</h3>
  <p>Kebijakan ini dapat berubah sewaktu-waktu. Perubahan akan diumumkan melalui aplikasi.</p>
  
  <p>Terakhir diperbarui: 9 Maret 2025</p>',
  TRUE
);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_user_policies_updated_at
BEFORE UPDATE ON user_policies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 