const supabase = require('./config/supabase');

async function testSupabaseClient() {
    console.log('Testing Supabase Client (via HTTPS API)...');
    
    if (!supabase) {
        console.error('❌ Supabase client not initialized. Check your .env file.');
        return;
    }

    try {
        // Test a simple query using the supabase client
        // This uses the REST API (PostgREST) which should be accessible over IPv4
        const { data, error } = await supabase
            .from('songs') // Assuming there's a songs table
            .select('count', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Supabase Client Error:', error.message);
            console.error('Details:', error);
        } else {
            console.log('✅ Supabase Client Successful!');
            console.log('Songs count:', data);
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err.message);
    }
}

testSupabaseClient();
