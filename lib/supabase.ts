import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { makeRedirectUri } from 'expo-auth-session';
import * as AuthSession from "expo-auth-session";
import AsyncStorage from '@react-native-async-storage/async-storage';

const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'fourdata',
  preferLocalhost: true
});

const isWeb = Platform.OS === 'web';

// Initialize WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

// For web, use localStorage
const webStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
    }
  },
};

// For native, use SecureStore
const nativeStorage = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

const storage = isWeb ? webStorage : nativeStorage;

// Supabase project's credentials
const supabaseUrl = 'https://mfrmfxtfjmuolckjfpys.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcm1meHRmam11b2xja2pmcHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4Mzk4MTEsImV4cCI6MjA4MTQxNTgxMX0.sClWkXWLf9vWS6Rsffse6gKzYatPJkSpm1n_vWZ0Jxc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // IMPORTANT: Set to false for Expo
    flowType: 'pkce', // Use PKCE flow
    debug: true, // Enable for debugging
  },
});

// Function to generate a random username
const generateUsername = (email: string) => {
  // Get first 5 characters of the email (or less if shorter)
  const prefix = email.split('@')[0].toLowerCase().slice(0, 5);
  // Generate 4 random digits
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomDigits}`;
};

// Add this debug code FIRST
const debugUri = makeRedirectUri({
  scheme: 'yourapp', // Your app's custom scheme
  preferLocalhost: false
});

console.log('DEBUG - iOS Redirect URI:', debugUri);

// Get the correct redirect URL based on platform
const getRedirectUrl = () => {
  if (isWeb) {
    console.log('window.location.origin: ', window.location.origin);
    return `${window.location.origin}/auth/callback`;
  }

  // For mobile, use the app's custom URL scheme
  const redirectUrl = makeRedirectUri({
    scheme: 'fourdata',  // Make sure this matches your app.json scheme
    path: 'auth/callback'
  });
  
  console.log('Redirect URL:', redirectUrl);
  return redirectUrl;
};

// Initialize auth requests
let googleAuthRequest = null;
let facebookAuthRequest = null;

// Only create the auth request on the client side
if (typeof window !== 'undefined') {
  googleAuthRequest = {
    // Replace these with your actual client IDs from Google Cloud Console
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: '457819047674-uu6gg5cpqh2vri5i34jglmhpkl4at8il.apps.googleusercontent.com',
    webClientId: '457819047674-8m2uiko9ddds5g608etkn7aj3tbrgbke.apps.googleusercontent.com',
    expoClientId: '457819047674-8m2uiko9ddds5g608etkn7aj3tbrgbke.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    redirectUri: getRedirectUrl(),
  };
}

// Helper function to handle Facebook OAuth sign in
export const signInWithFacebook = async () => {
  try {
    if (!facebookAuthRequest) {
      const redirectUrl = getRedirectUrl();
      console.log('Facebook redirect URL:', redirectUrl);
      
      const response = await WebBrowser.openAuthSessionAsync(
        `https://${process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-project-id.supabase.co'}/auth/v1/authorize?provider=facebook&redirect_to=${encodeURIComponent(redirectUrl)}`,
        redirectUrl
      );

      if (response.type === 'success') {
        const url = new URL(response.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) throw error;
          return data;
        }
      }
      throw new Error('Facebook authentication was cancelled');
    }
  } catch (error) {
    console.error('Facebook auth error:', error);
    throw error;
  }
};

// Helper function to handle Google OAuth sign in
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true, // Important for mobile
      },
    });

    if (error) {
      console.error('Google OAuth error:', error);
      throw error;
    }
    console.log('OAuth response:', data); // Debug log

    // Open the auth URL in the browser
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      console.log('Auth session result:', result)
      if (result.type === 'success') {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;
          return sessionData;
        }
      }
    }

    throw new Error('Authentication failed');
  } catch (error) {
    console.error('Exception in signInWithGoogle:', error);
    throw error;
  }
};

// Function to handle auth state changes
export const handleAuthStateChange = async (event: string, session: any) => {
  console.log('Auth state changed:', event);
  
  if (event === 'SIGNED_IN' && session?.user) {
    console.log('User signed in:', session.user);
    
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        return;
      }
      
      if (!user) {
        console.error('No user found after sign in');
        return;
      }
      
      console.log('Checking for existing profile for user:', user.id);
      
      // First, try to get the profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      console.log('Profile check - data:', profile, 'error:', profileError);
      
      // If we have a profile, no need to create one
      if (profile) {
        console.log('Profile already exists:', profile);
        return;
      }
      
      // If we get here, we need to create a profile
      console.log('No existing profile found. Creating new profile...');
      const username = generateUsername(user.email || 'user');
      console.log('Generated username:', username);
      
      const { data: newProfile, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })
        .select()
        .single();
      
      if (upsertError) {
        console.error('Error creating profile:', upsertError);
        // Check if it's a permission issue
        if (upsertError.message.includes('permission denied')) {
          console.error('Permission denied. Please check your RLS policies on the profiles table.');
        }
      } else if (newProfile) {
        console.log('Profile created successfully:', newProfile);
      }
    } catch (e) {
      console.error('Exception in handleAuthStateChange:', e);
    }
  }
};
// Set up the auth state change listener
if (isWeb) {
  console.log('Setting up auth state change listener...');
  supabase.auth.onAuthStateChange(handleAuthStateChange);
}