const { createClient } = require('@supabase/supabase-js');

// NOTA: Reemplaza estos valores con las credenciales que te dé tu dashboard de Supabase
const SUPABASE_URL = 'https://lpwvxntsowhqqzbdxgtg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_R8So7GJo4sAiDhD76J9JNw_cq1mscWU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

module.exports = supabase;