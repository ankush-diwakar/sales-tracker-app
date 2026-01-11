import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts'; 
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getAnalyticsData } from '../services/db';

// Fancy Palette for Pie Chart
const PIE_COLORS = ['#1D9BF0', '#00BA7C', '#FFD400', '#F91880', '#794BC4'];

// --- HELPER: Get Date Range String ---
const getDateRangeLabel = (tab: string) => {
    const end = new Date();
    const start = new Date();
    
    if (tab === 'Week') start.setDate(end.getDate() - 7);
    if (tab === 'Month') start.setDate(end.getDate() - 30);
    
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    
    if (tab === 'Today') return `Today, ${end.toLocaleDateString('en-GB', options)}`;
    return `${start.toLocaleDateString('en-GB', options)} - ${end.toLocaleDateString('en-GB', options)}`;
};

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [selectedTab, setSelectedTab] = useState<'Today' | 'Week' | 'Month'>('Week'); 
    const [searchText, setSearchText] = useState('');
    
    // Toggle State now handles 3 types: Bar -> Pie -> Area
    const [chartType, setChartType] = useState<'bar' | 'pie' | 'area'>('bar'); 

    // Data States
    const [barData, setBarData] = useState<any[]>([]);
    const [pieData, setPieData] = useState<any[]>([]); 
    const [areaData, setAreaData] = useState<any[]>([]); 
    const [trendingItems, setTrendingItems] = useState<any[]>([]);
    const [maxProfit, setMaxProfit] = useState(0);
    const [totalProfit, setTotalProfit] = useState(0);

    // --- FETCH DATA ---
    const fetchData = async () => {
        setLoading(true);
        const data = await getAnalyticsData(selectedTab);

        if (data) {
            // 1. Prepare 3D Bar Data
            const styledBarData = data.barData.map((item: any) => ({
                ...item,
                frontColor: '#1D9BF0', // Main Blue face
                sideColor: '#007ACC',  // Darker Blue side
                topColor: '#4DABF7',   // Lighter Blue top
                topLabelComponent: () => (
                    <Text style={{ color: '#71767B', fontSize: 10, marginBottom: 4, fontWeight: 'bold' }}>
                        {Math.round(item.value)}
                    </Text>
                ),
            }));

            // 2. Prepare Pie Data 
            const styledPieData = data.barData.map((item: any, index: number) => ({
                value: item.value,
                color: PIE_COLORS[index % PIE_COLORS.length],
                text: '', 
                category: item.label,
                // Make the largest slice pop out slightly
                focused: index === 0, 
            }));

            // 3. Prepare Area Data
            const styledAreaData = data.lineData.map((item: any) => ({
                value: item.value,
                label: item.label,
                labelTextStyle: { color: '#71767B', fontSize: 10 },
            }));

            // Calculations
            const max = Math.max(...data.barData.map((d: any) => d.value));
            const total = data.barData.reduce((sum: number, item: any) => sum + item.value, 0);

            setBarData(styledBarData);
            setPieData(styledPieData);
            setAreaData(styledAreaData);
            setTrendingItems(data.trendingItems);
            setMaxProfit(max || 1000);
            setTotalProfit(total);
        }
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [selectedTab])
    );

    const filteredItems = trendingItems.filter(item =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
    );

    // Helper to toggle between the 3 charts
    const toggleChart = () => {
        if (chartType === 'bar') setChartType('pie');
        else if (chartType === 'pie') setChartType('area');
        else setChartType('bar');
    };

    // Helper to get icon name
    const getToggleIcon = () => {
        if (chartType === 'bar') return 'pie-chart';
        if (chartType === 'pie') return 'show-chart'; // Area icon
        return 'bar-chart';
    };

    return (
        <SafeAreaView className="flex-1 bg-black">

            {/* Search Header */}
            <View className="px-4 py-2">
                <View className="flex-row items-center h-12 px-4 border rounded-full bg-primary/10 border-primary/30">
                    <MaterialIcons name="search" size={20} color="#1D9BF0" />
                    <TextInput
                        placeholder="Search analytics..."
                        placeholderTextColor="#71767B"
                        value={searchText}
                        onChangeText={setSearchText}
                        className="flex-1 ml-2 text-base text-white"
                        style={{ textAlignVertical: 'center', height: '100%', paddingVertical: 0 }} // Fix cut-off
                    />
                </View>
            </View>

            {/* Tabs */}
            <View className="flex-row mt-2 border-b border-white/20">
                {['Today', 'Week', 'Month'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setSelectedTab(tab as any)}
                        className={`items-center flex-1 pb-3 border-b-4 ${selectedTab === tab ? 'border-primary' : 'border-transparent'}`}
                    >
                        <Text className={`font-bold ${selectedTab === tab ? 'text-white' : 'text-gray-500'}`}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView className="flex-1">
                {loading ? (
                    <View className="items-center mt-20">
                        <ActivityIndicator size="large" color="#1D9BF0" />
                    </View>
                ) : (
                    <>
                        {/* CHART CARD */}
                        <View className="p-4 border-b border-white/20">
                            {/* Card Header */}
                            <View className="flex-row items-start justify-between mb-6">
                                <View>
                                    <Text className="text-xl font-bold text-white">Profit Analysis</Text>
                                    <Text className="mt-1 text-xs text-gray-500">
                                        {getDateRangeLabel(selectedTab)}
                                    </Text>
                                </View>
                                
                                {/* TOGGLE BUTTON */}
                                <TouchableOpacity 
                                    onPress={toggleChart}
                                    className="p-2 border rounded-full bg-primary/20 border-primary/50"
                                >
                                    <MaterialIcons 
                                        name={getToggleIcon() as any} 
                                        size={24} 
                                        color="#1D9BF0" 
                                    />
                                </TouchableOpacity>
                            </View>

                            {/* CHART AREA */}
                            <View className="items-center pb-4">
                                {barData.length > 0 ? (
                                    chartType === 'bar' ? (
                                        // --- 3D BAR CHART ---
                                        <BarChart
                                            key={`bar-${selectedTab}`} // Forces re-animation on tab change
                                            data={barData}
                                            barWidth={35}
                                            noOfSections={4}
                                            isThreeD // <--- 3D EFFECT
                                            sideWidth={10}
                                            sideColor="#007ACC"
                                            topColor="#4DABF7"
                                            barBorderTopLeftRadius={2} // Pointed edges
                                            barBorderTopRightRadius={2}
                                            frontColor="#1D9BF0"
                                            yAxisThickness={0}
                                            xAxisThickness={0}
                                            hideRules
                                            yAxisTextStyle={{ color: '#71767B', fontSize: 10 }}
                                            xAxisLabelTextStyle={{ color: '#E7E9EA', fontSize: 11 }}
                                            maxValue={maxProfit * 1.2}
                                            isAnimated
                                            animationDuration={800}
                                            width={300}
                                        />
                                    ) : chartType === 'pie' ? (
                                        // --- PIE CHART (Improved) ---
                                        <View className="flex-row items-center">
                                            <PieChart
                                                key={`pie-${selectedTab}`}
                                                data={pieData}
                                                donut
                                                radius={80}
                                                innerRadius={55}
                                                innerCircleColor="#000000"
                                                centerLabelComponent={() => (
                                                    <View className="items-center justify-center">
                                                        <Text className="text-xs text-gray-500">Total</Text>
                                                        <Text className="text-lg font-bold text-white">₹{totalProfit}</Text>
                                                    </View>
                                                )}
                                                isAnimated
                                                animationDuration={1000}
                                                strokeWidth={2} // Clean separation
                                                strokeColor="#000000"
                                            />
                                            {/* Legend */}
                                            <View className="ml-6">
                                                {pieData.map((item, idx) => (
                                                    <View key={idx} className="flex-row items-center mb-2">
                                                        <View style={{backgroundColor: item.color}} className="w-3 h-3 mr-2 rounded-sm"/>
                                                        <Text className="text-xs text-gray-400">{item.category}</Text>
                                                        <Text className="ml-2 text-xs font-bold text-white">
                                                            {Math.round((item.value / totalProfit) * 100)}%
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ) : (
                                        // --- AREA CHART (Glowing Blue) ---
                                        <LineChart
                                            key={`area-${selectedTab}`}
                                            areaChart
                                            curved
                                            data={areaData}
                                            color="#1D9BF0"
                                            thickness={3}
                                            startFillColor="#1D9BF0"
                                            endFillColor="#1D9BF0"
                                            startOpacity={0.3}
                                            endOpacity={0.05}
                                            noOfSections={4}
                                            yAxisThickness={0}
                                            xAxisThickness={0}
                                            hideRules
                                            hideDataPoints // Cleaner look like the image
                                            yAxisTextStyle={{ color: '#71767B', fontSize: 10 }}
                                            xAxisLabelTextStyle={{ color: '#E7E9EA', fontSize: 10 }}
                                            isAnimated
                                            animationDuration={1200}
                                            width={300}
                                            // Pointer Config (Interactive Touch)
                                            pointerConfig={{
                                                pointerStripUptoDataPoint: true,
                                                pointerStripColor: '#1D9BF0',
                                                pointerStripWidth: 2,
                                                strokeDashArray: [2, 5],
                                                pointerColor: '#1D9BF0',
                                                radius: 4,
                                                pointerLabelWidth: 100,
                                                pointerLabelHeight: 120,
                                                activatePointersOnLongPress: false,
                                                autoAdjustPointerLabelPosition: false,
                                                pointerLabelComponent: (items: any) => {
                                                    return (
                                                        <View className="items-center justify-center px-4 py-2 bg-gray-800 rounded-lg">
                                                            <Text className="text-xs text-gray-400">{items[0].label}</Text>
                                                            <Text className="font-bold text-white">₹{items[0].value}</Text>
                                                        </View>
                                                    );
                                                },
                                            }}
                                        />
                                    )
                                ) : (
                                    <View className="items-center justify-center h-40">
                                        <Text className="text-gray-500">No profit data available</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* TOP PERFORMERS LIST */}
                        <View className="pb-20 mt-4">
                            <View className="flex-row items-center justify-between px-4 mb-2">
                                <Text className="text-xl font-bold text-white">Top Performers</Text>
                                <Ionicons name="trophy-outline" size={20} color="#FFD400" />
                            </View>

                            {filteredItems.length > 0 ? filteredItems.map((item, index) => (
                                <View key={index} className="flex-row justify-between px-4 py-4 border-b border-white/10">
                                    <View className="flex-row items-center gap-3">
                                        <View className={`w-8 h-8 rounded-full items-center justify-center ${index === 0 ? 'bg-yellow-500/20' : index === 1 ? 'bg-gray-400/20' : index === 2 ? 'bg-orange-700/20' : 'bg-transparent'}`}>
                                            <Text className={`font-bold ${index === 0 ? 'text-[#FFD400]' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-[#CD7F32]' : 'text-gray-600'}`}>
                                                #{index + 1}
                                            </Text>
                                        </View>
                                        <View>
                                            <Text className="text-base font-bold text-white">{item.name}</Text>
                                            <Text className="text-xs text-gray-500">{item.category} · {item.count} sales</Text>
                                        </View>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-base font-bold text-white">₹{item.totalProfit}</Text>
                                        <Text className="text-xs text-gray-500">profit</Text>
                                    </View>
                                </View>
                            )) : (
                                <Text className="mt-10 text-center text-gray-500">No items found</Text>
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}