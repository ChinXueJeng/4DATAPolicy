import { useSubscription } from "@/contexts/SubscriptionContext";
import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";

import RevenueCatUI from "react-native-purchases-ui";

export default function Paywall() {
  const { handleSubscriptionChange } = useSubscription();
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <RevenueCatUI.Paywall
        onRestoreCompleted={() => {
          // Restore completed callback
          console.log("Restore completed");
          handleSubscriptionChange();
        }}
        onPurchaseCompleted={() => {
          // Purchase completed callback
          console.log("Purchase completed");
          handleSubscriptionChange();
        }}
        onDismiss={() => {
          // Dismiss the paywall, i.e. remove the view, navigate to another screen, etc.
          // Will be called when the close button is pressed (if enabled) or when a purchase succeeds.
        }}
      />
    </View>
  );
}
