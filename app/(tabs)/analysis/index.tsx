import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useLanguage } from '@/app/contexts/LanguageContext';


interface LotteryResult {
  draw_date: string;
  number: string;
  prize_type: string;
  total_points: number | null;
}
export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const [results, setResults] = useState<Record<string, LotteryResult[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t, currentLanguage } = useLanguage();

  // Function to format date based on current language
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (currentLanguage === 'zh') {
      // Chinese date format: YYYY年M月D日
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    }
    // Default to English format: Month Day, Year
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const handleCardPress = (date: string) => {
    // Format the date to YYYY-MM-DD for the URL
    const formattedDate = new Date(date).toISOString().split('T')[0];
    router.push(`/analysis/analysis-details?date=${formattedDate}`);
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        
        // Fetch the 10 most recent lottery dates with their 1st, 2nd, and 3rd prizes and total_points
        const { data, error: fetchError } = await supabase
          .from('result')
          .select('draw_date, number, prize_type, total_points')
          .in('prize_type', ['1', '2', '3'])
          .order('draw_date', { ascending: false })
          .limit(30); // 10 dates * 3 prize types
        if (fetchError) throw fetchError;
        // Group results by date
        const groupedResults = data.reduce((acc: Record<string, LotteryResult[]>, item) => {
          const date = formatDate(item.draw_date);
          
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(item);
          return acc;
        }, {} as Record<string, LotteryResult[]>);
        setResults(groupedResults);
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Failed to load lottery results');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, []);
  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backBtn, shadow]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={16} />
          <Text style={styles.backText}>{t('back')}</Text>
        </TouchableOpacity>
        <Image
          source={require("@/assets/images/TotoLOGO.png")}
          style={{ height: 50, width: 50, borderRadius: 10 }}
        />
      </View>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {Object.entries(results).map(([date, prizes], index) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.card, styles.shadow]}
            onPress={() => handleCardPress(prizes[0].draw_date)} // Use the original draw_date from the first prize
          >
            <Text style={styles.date}>{t('pastresults')}{date}</Text>
            <View style={styles.prizeContainer}>
              {prizes
                .sort((a, b) => parseInt(a.prize_type) - parseInt(b.prize_type))
                .map((prize, idx) => (
                  <View 
                    key={idx} 
                    style={[
                      styles.prizeBox,
                      prize.total_points !== null && prize.total_points >= 85 && { backgroundColor: "#42ea61" },
                      prize.total_points !== null && prize.total_points >= 70 && prize.total_points < 85 && { backgroundColor: "#a2ffb3" },
                      prize.total_points !== null && prize.total_points < 70 && { backgroundColor: "#fffbb5" },
                    ]}
                  >
                    <Text style={styles.prizeNumber}>{prize.number}</Text>
                  </View>
                ))}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
const shadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 5,
  elevation: 8,
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef2f7",
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 20,
  },

  backText: {
    fontSize: 13,
  },

  logo: {
    backgroundColor: "#000",
    borderRadius: 14,
    padding: 6,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },

  date: {
    fontSize: 13,
    color: "#555",
    marginBottom: 10,
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  pill: {
    flex: 1,
    backgroundColor: "#42ea61",
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },

  pillText: {
    color: "#000",
    fontWeight: "600",
    fontSize: 13,
  },
   errorText: {
    color: "red",
    textAlign: "center",
    padding: 20,
  },
  prizeContainer: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  prizeBox: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 12,
    minWidth: 100,
  },
  prizeType: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  prizeNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 5,
    elevation: 5, // for Android
    backgroundColor: 'white', // Important for shadow to show on iOS
  },
});

