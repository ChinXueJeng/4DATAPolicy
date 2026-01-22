import React, { createContext, useContext, useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';
import { supabase } from '@/lib/supabase';

interface SubscriptionContextType {
  isSubscribed: boolean;
  isLoading: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Replace with your RevenueCat API key
const REVENUECAT_API_KEY = 'test_BmGCUarSHiNXAMtXbrUediqRzqF'; // Replace with your actual API key

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const setupRevenueCat = async () => {
      try {
        // Initialize RevenueCat
        await Purchases.configure({
          apiKey: REVENUECAT_API_KEY,
          useAmazon: false,
        });
        
        // Check subscription status
        await checkSubscription();
      } catch (error) {
        console.error('Error setting up RevenueCat:', error);
        setIsLoading(false);
      }
    };

    setupRevenueCat();
  }, []);

  const checkSubscription = async () => {
    try {
      setIsLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsSubscribed(false);
        return;
      }
      
      // Set the user ID for RevenueCat
      await Purchases.logIn(user.id);
      
      // Get customer info
      const customerInfo = await Purchases.getCustomerInfo();
      
      // Check if user has active subscription
      const hasActiveSubscription = customerInfo.entitlements.active['premium'] !== undefined;
      
      setIsSubscribed(hasActiveSubscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SubscriptionContext.Provider value={{ isSubscribed, isLoading, checkSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
