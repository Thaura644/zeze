const supabase = require('./config/supabase');

async function testSupabaseClient() {
    console.log('Testing Supabase Client (via HTTPS API)...');
    
    if (!supabase) {
        console.error('❌ Supabase client not initialized.');
        return;
    }

    try {
        const { data, error } = await supabase
            .from('songs')
            .select('*')
            .limit(1);

        if (error) {
            console.error('❌ Supabase Client Error:', error.message);
        } else {
            console.log('✅ Supabase Client Successful!');
            console.log('Sample data:', data);
        }

        const { data: tables, error: tableError } = await supabase
            .rpc('get_tables'); // This might not exist, let's try a common table
        
        if (tableError) {
             console.log('Note: RPC get_tables failed (expected if not defined)');
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err.message);
    }
}

testSupabaseClient();
