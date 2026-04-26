const { createClient: createSupabaseClient } = require('@supabase/supabase-js');

const supabase = createSupabaseClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function logCall(callData) {
  const { data, error } = await supabase
    .from('calls')
    .insert([callData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

async function getClientByAgentId(agentId) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('retell_agent_id', agentId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

async function getClientById(id) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();

  // PGRST116 = row not found, return null instead of throwing
  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

async function createClient(clientData) {
  const { data, error } = await supabase
    .from('clients')
    .insert([clientData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateClient(id, clientData) {
  const { data, error } = await supabase
    .from('clients')
    .update(clientData)
    .eq('id', id)
    .select()
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data ?? null;
}

async function deleteClient(id) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

module.exports = { logCall, getClients, getClientByAgentId, getClientById, createClient, updateClient, deleteClient };
