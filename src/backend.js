import {createClient} from '@supabase/supabase-js';
export const db=import.meta.env.VITE_SUPABASE_URL&&import.meta.env.VITE_SUPABASE_ANON_KEY?createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_ANON_KEY):null;
export async function rpc(name,args){const {data,error}=await db.rpc(name,args);if(error)throw error;return data;}
export async function signIn(){const {data,error}=await db.auth.getSession();if(error)throw error;if(!data.session){const r=await db.auth.signInAnonymously();if(r.error)throw r.error;}}
