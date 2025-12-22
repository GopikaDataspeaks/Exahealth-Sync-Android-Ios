import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, TouchableOpacity, View, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { computeRange, RangeKey, todayKey } from '../../src/health/rangeUtils';
import { useHealthStore } from '../../src/state/healthStore';
import { Button, Card } from '../../src/ui/Primitives';

type MetricKey =
  | 'steps'
  | 'calories'
  | 'distance'
  | 'sleep'
  | 'active'
  | 'heart'
  | 'bp'
  | 'glucose'
  | 'temperature'
  | 'oxygen'
  | 'respiratory'
  | 'weight';

type ChartPoint = { value: number; label: string; fullLabel: string };
type StackedPoint = { label: string; fullLabel: string; stacks: { value: number; color: string; label: string }[] };

const metricConfig: Record<
  MetricKey,
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; suffix?: string }
> = {
  steps: { label: 'Steps', icon: 'walk' },
  calories: { label: 'Calories', icon: 'fire', suffix: 'kcal' },
  distance: { label: 'Distance', icon: 'map-marker-distance', suffix: 'km' },
  sleep: { label: 'Sleep', icon: 'sleep', suffix: 'hrs' },
  active: { label: 'Active minutes', icon: 'run', suffix: 'min' },
  heart: { label: 'Heart rate', icon: 'heart-pulse', suffix: 'bpm' },
  bp: { label: 'Blood pressure', icon: 'heart', suffix: 'mmHg' },
  glucose: { label: 'Blood glucose', icon: 'water', suffix: 'mg/dL' },
  temperature: { label: 'Body temp', icon: 'thermometer', suffix: '°C' },
  oxygen: { label: 'Oxygen saturation', icon: 'heart-plus', suffix: '%' },
  respiratory: { label: 'Respiratory rate', icon: 'lungs', suffix: 'rpm' },
  weight: { label: 'Weight', icon: 'weight-kilogram', suffix: 'kg' },
};

export default function MetricDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ metric: MetricKey }>();
  const metric = (params.metric as MetricKey) || 'steps';
  const config = metricConfig[metric];
  const daily = useHealthStore(s => s.daily);
  const syncRange = useHealthStore(s => s.syncRange);

  const [rangeKey, setRangeKey] = useState<RangeKey>('today');
  const [windowOffset, setWindowOffset] = useState(0); // negative = past windows
  const [{ windowStart, windowEnd }, setWindowRange] = useState(() => computeWindow('today', 0));
  const [paging, setPaging] = useState(false);
  const [customStart] = useState<string>('');
  const [customEnd] = useState<string>('');

  useEffect(() => {
    const next = computeWindow(rangeKey, windowOffset);
    setWindowRange(next);
    const key = rangeKey === 'today' && windowOffset === 0 ? 'today' : 'custom';
    syncRange(key as RangeKey, next.windowStart, next.windowEnd);
  }, [rangeKey, windowOffset, customStart, customEnd, syncRange]);

  const today = todayKey();
  const todayEntry = daily.find(d => d.date === today);

  const viewKey: RangeKey | 'day' =
    rangeKey === 'today' && windowOffset === 0
      ? 'today'
      : rangeKey === 'today'
        ? 'day'
        : rangeKey;

  const chartConfig = useMemo(
    () => buildChartConfig(daily, metric, viewKey, config.suffix),
    [daily, metric, viewKey, config.suffix],
  );

  const summary = useMemo(() => {
    if (!daily.length) return { kind: 'value', text: '--', unit: '' } as const;
    if (metric === 'bp') {
      const sys = daily.map(d => d.bloodPressureSystolic).filter(isNumber);
      const dia = daily.map(d => d.bloodPressureDiastolic).filter(isNumber);
      const avgSys = sys.length ? average(sys).toFixed(0) : '--';
      const avgDia = dia.length ? average(dia).toFixed(0) : '--';
      return { kind: 'bp', sys: avgSys, dia: avgDia } as const;
    }
    if (metric === 'sleep') {
      const totalMinutes = daily.reduce((acc, d) => acc + (d.sleepMinutes ?? 0), 0);
      return { kind: 'value', text: (totalMinutes / 60).toFixed(1), unit: 'hrs' } as const;
    }
    if (['steps', 'calories', 'distance', 'active'].includes(metric)) {
      const total = daily.reduce((acc, d) => acc + (getMetricValue(d, metric) ?? 0), 0);
      return {
        kind: 'value',
        text: metric === 'distance' ? total.toFixed(2) : total.toFixed(0),
        unit: metric === 'steps' ? 'steps' : (metricConfig[metric].suffix ?? ''),
      } as const;
    }
    const values = daily.map(d => getMetricValue(d, metric)).filter(isNumber) as number[];
    return {
      kind: 'value',
      text: values.length ? average(values).toFixed(0) : '--',
      unit: metricConfig[metric].suffix ?? '',
    } as const;
  }, [daily, metric]);

  const todayValueString = useMemo(() => {
    const entry = todayEntry;
    if (!entry) return '--';
    if (metric === 'bp') {
      const sys = entry.bloodPressureSystolic?.toFixed(0) ?? '--';
      const dia = entry.bloodPressureDiastolic?.toFixed(0) ?? '--';
      return `${sys}/${dia}`;
    }
    return formatMetricValue(getMetricValue(entry, metric), metric, config.suffix);
  }, [todayEntry, metric, config.suffix]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f172a' }}>
      <StatusBar style="light" />
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{config.label}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Card>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {['today', '7d', '30d'].map((k) => (
              <TouchableOpacity
                key={k}
                onPress={() => {
                  setRangeKey(k as RangeKey);
                  setWindowOffset(0);
                }}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 16,
                  borderRadius: 20,
                  backgroundColor: rangeKey === k ? '#334155' : '#1e293b',
                }}>
                <Text style={{ color: rangeKey === k ? 'white' : '#94a3b8', fontWeight: 'bold' }}>{k.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Header Summary exactly like Photo */}
          <View style={{ marginBottom: 20 }}>
            {summary.kind === 'bp' ? (
              <View style={{ flexDirection: 'row', gap: 24 }}>
                <View>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>● SYSTOLIC</Text>
                  <Text style={{ color: 'white', fontSize: 32, fontWeight: '900' }}>{summary.sys}</Text>
                </View>
                <View>
                  <Text style={{ color: '#f472b6', fontSize: 12, fontWeight: 'bold' }}>♦ DIASTOLIC</Text>
                  <Text style={{ color: 'white', fontSize: 32, fontWeight: '900' }}>{summary.dia}</Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>{['steps', 'calories', 'distance', 'active', 'sleep'].includes(metric) ? 'TOTAL' : 'AVERAGE'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Text style={{ color: 'white', fontSize: 36, fontWeight: '900' }}>{summary.text}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 18 }}>{summary.unit}</Text>
                </View>
              </View>
            )}
            <Text style={{ color: '#64748b', fontSize: 14 }}>{formatWindowLabel(windowStart, windowEnd)}</Text>
          </View>

          <ChartSection
            suffix={config.suffix}
            chartConfig={chartConfig}
            onSwipePrev={() => handleWindowShift(rangeKey, setWindowOffset, -1)}
            onSwipeNext={() => handleWindowShift(rangeKey, setWindowOffset, 1)}
            disableNext={windowOffset === 0}
            paging={paging}
            setPaging={setPaging}
          />
        </Card>

        <Card title="Today's Reading">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MaterialCommunityIcons name={config.icon} size={28} color="#ef4444" />
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>{todayValueString}</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

type ChartConfig =
  | { kind: 'bar'; data: ChartPoint[]; color: string; gradient: string; barWidth: number; spacing: number }
  | { kind: 'stacked'; data: StackedPoint[]; barWidth: number; spacing: number; legend: { label: string; color: string }[] }
  | { kind: 'line'; data: ChartPoint[]; color: string; fillColor?: string; spacing: number; showDots?: boolean }
  | { kind: 'dual-line'; data: ChartPoint[]; data2: ChartPoint[]; color: string; color2: string; spacing: number }
  | { kind: 'deviation'; data: ChartPoint[]; color: string; baseline: number; spacing: number };

function ChartSection({
  suffix,
  chartConfig,
  onSwipePrev,
  onSwipeNext,
  disableNext,
  paging,
  setPaging,
}: {
  suffix?: string;
  chartConfig: ChartConfig;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
  disableNext: boolean;
  paging: boolean;
  setPaging: (v: boolean) => void;
}) {
  const screenWidth = Dimensions.get('window').width;
  const seriesLength =
    chartConfig.kind === 'stacked'
      ? chartConfig.data.length
      : chartConfig.kind === 'dual-line'
        ? chartConfig.data.length
        : chartConfig.data.length;
  const baseWidth =
    chartConfig.kind === 'bar' || chartConfig.kind === 'stacked'
      ? chartConfig.barWidth + chartConfig.spacing
      : chartConfig.spacing;
  const chartWidth = Math.max(screenWidth + 40, seriesLength * baseWidth + 120);

  const handleScroll = useCallback(
    (e: any) => {
      if (paging) return;
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const nearStart = contentOffset.x <= 30;
      const nearEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 30;
      if (nearStart) {
        setPaging(true);
        onSwipePrev();
        setTimeout(() => setPaging(false), 300);
      } else if (nearEnd && !disableNext) {
        setPaging(true);
        onSwipeNext();
        setTimeout(() => setPaging(false), 300);
      }
    },
    [onSwipeNext, onSwipePrev, disableNext, paging, setPaging],
  );

  const barPointerConfig = {
    pointerStripHeight: 180,
    pointerStripColor: '#334155',
    pointerStripWidth: 1,
    pointerColor: '#22c55e',
    radius: 5,
    pointerLabelWidth: 120,
    pointerLabelHeight: 80,
    activatePointersOnLongPress: false,
    pointerLabelComponent: (items: any[]) => {
      const item = items?.[0];
      if (!item) return null;
      const stackTotal = Array.isArray(item.stacks) ? item.stacks.reduce((acc: number, s: any) => acc + (s.value ?? 0), 0) : undefined;
      const value = item.value ?? stackTotal ?? 0;
      const formatted = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(1);
      return (
        <View style={{ backgroundColor: '#1e293b', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#334155', maxWidth: 180, transform: [{ translateY: 13 }],position:'relative',zIndex:999 }} >
          <Text style={{ color: '#94a3b8', fontSize: 10 }}>{item.fullLabel}</Text>
          {Array.isArray(item.stacks) ? (
            <View style={{ gap: 2, marginTop: 4 }}>
              {item.stacks.map((stack: any) => (
                <Text key={stack.label} style={{ color: 'white', fontSize: 12 }}>
                  {stack.label}: {(stack.value / 60).toFixed(1)} hrs
                </Text>
              ))}
              <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Total: {(value / 60).toFixed(1)} hrs</Text>
            </View>
          ) : (
            <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
              {formatted} {suffix || ''}
            </Text>
          )}
        </View>
      );
    },
  };

  const linePointerConfig = {
    pointerColor: '#22c55e',
    pointerStripColor: '#334155',
    pointerStripWidth: 1,
    pointerStripHeight: 180,
    radius: 4,
    pointerLabelWidth: 120,
    pointerLabelHeight: 80,
    pointerLabelComponent: (items: any[]) => {
      const item = items?.[0];
      if (!item) return null;
      const formatted = Math.abs(item.value ?? 0) >= 10 ? item.value.toFixed(0) : item.value.toFixed(1);
      return (
        <View style={{ position:"relative", top:12, backgroundColor: '#1e293b', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#334155', transform: [{ translateY: -2 }] }}>
          <Text style={{ color: '#94a3b8', fontSize: 10 }}>{item.fullLabel}</Text>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
            {formatted} {suffix || ''}
          </Text>
        </View>
      );
    },
  };

  const dualPointerConfig = {
    ...linePointerConfig,
    pointerLabelWidth: 180,
    pointerLabelComponent: (items: any[]) => {
      const sys = items?.[0];
      const dia = items?.[1];
      if (!sys && !dia) return null;
      return (
        <View style={{ backgroundColor: '#1e293b', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#334155', transform: [{ translateY: -10 }] }}>
          <Text style={{ color: '#94a3b8', fontSize: 10 }}>{sys?.fullLabel || dia?.fullLabel}</Text>
          <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold' }}>
            {sys?.value?.toFixed(0) ?? '--'} / {dia?.value?.toFixed(0) ?? '--'} {suffix || 'mmHg'}
          </Text>
        </View>
      );
    },
  };

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        onMomentumScrollEnd={handleScroll}>
        {chartConfig.kind === 'bar' ? (
          <BarChart
            data={chartConfig.data}
            width={chartWidth}
            height={220}
            barWidth={chartConfig.barWidth}
            spacing={chartConfig.spacing}
            roundedTop
            roundedBottom
            hideRules={false}
            rulesType="dashed"
            rulesColor="#1e293b"
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: '#475569', fontSize: 10 }}
            xAxisLabelTextStyle={{ color: '#475569', fontSize: 10 }}
            noOfSections={4}
            frontColor={chartConfig.color}
            showGradient
            gradientColor={chartConfig.gradient}
            isAnimated
            pointerConfig={barPointerConfig}
          />
        ) : chartConfig.kind === 'stacked' ? (
          <BarChart
            stackData={chartConfig.data}
            width={chartWidth}
            height={220}
            barWidth={chartConfig.barWidth}
            spacing={chartConfig.spacing}
            roundedTop
            hideRules={false}
            rulesType="dashed"
            rulesColor="#1e293b"
            xAxisThickness={0}
            yAxisThickness={0}
            yAxisTextStyle={{ color: '#475569', fontSize: 10 }}
            xAxisLabelTextStyle={{ color: '#475569', fontSize: 10 }}
            noOfSections={4}
            barBorderRadius={8}
            isAnimated
            pointerConfig={barPointerConfig}
          />
        ) : chartConfig.kind === 'dual-line' ? (
          <LineChart
            width={chartWidth}
            height={220}
            data={chartConfig.data}
            data2={chartConfig.data2}
            spacing={chartConfig.spacing}
            initialSpacing={20}
            thickness={3}
            color={chartConfig.color}
            color1={chartConfig.color}
            color2={chartConfig.color2}
            hideRules={false}
            rulesType="dashed"
            rulesColor="#1e293b"
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={{ color: '#475569', fontSize: 10 }}
            xAxisLabelTextStyle={{ color: '#475569', fontSize: 10 }}
            curved
            showDataPointOnFocus
            focusEnabled
            hideDataPoints={false}
            hideDataPoints2={false}
            dataPointsColor={chartConfig.color}
            dataPointsColor2={chartConfig.color2}
            dataPointsRadius={4}
            dataPointsRadius2={4}
            pointerConfig={dualPointerConfig}
          />
        ) : chartConfig.kind === 'deviation' ? (
          <LineChart
            width={chartWidth}
            height={220}
            data={chartConfig.data}
            spacing={chartConfig.spacing}
            initialSpacing={20}
            thickness={3}
            color={chartConfig.color}
            hideRules={false}
            rulesType="dashed"
            rulesColor="#1e293b"
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={{ color: '#475569', fontSize: 10 }}
            xAxisLabelTextStyle={{ color: '#475569', fontSize: 10 }}
            curved
            areaChart
            startFillColor={chartConfig.color}
            endFillColor="#0f172a"
            startOpacity={0.25}
            endOpacity={0.05}
            referenceLine1Position={0}
            showReferenceLine1
            referenceLine1Config={{ color: '#475569', thickness: 1, type: 'dashed' }}
            hideDataPoints={false}
            dataPointsColor={chartConfig.color}
            dataPointsRadius={4}
            pointerConfig={linePointerConfig}
          />
        ) : (
          <LineChart
            width={chartWidth}
            height={220}
            data={chartConfig.data}
            spacing={chartConfig.spacing}
            initialSpacing={20}
            thickness={3}
            color={chartConfig.color}
            hideRules={false}
            rulesType="dashed"
            rulesColor="#1e293b"
            yAxisThickness={0}
            xAxisThickness={0}
            yAxisTextStyle={{ color: '#475569', fontSize: 10 }}
            xAxisLabelTextStyle={{ color: '#475569', fontSize: 10 }}
            curved
            areaChart={!!chartConfig.fillColor}
            startFillColor={chartConfig.fillColor}
            endFillColor="#0f172a"
            startOpacity={chartConfig.fillColor ? 0.25 : 0}
            endOpacity={chartConfig.fillColor ? 0.05 : 0}
            hideDataPoints={!chartConfig.showDots}
            dataPointsColor={chartConfig.color}
            dataPointsRadius={chartConfig.showDots ? 4 : 0}
            pointerConfig={linePointerConfig}
          />
        )}
      </ScrollView>

      {chartConfig.kind === 'stacked' ? (
        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: 4 }}>
          {chartConfig.legend.map(item => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{item.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {chartConfig.kind === 'dual-line' ? (
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 4 }}>
          <LegendDot color={chartConfig.color} label="Systolic" />
          <LegendDot color={chartConfig.color2} label="Diastolic" />
        </View>
      ) : null}
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

// Helpers
function formatHour(d: string) {
  const h = new Date(d).getHours();
  return h === 0 ? '12A' : (h === 12 ? '12P' : (h > 12 ? `${h - 12}P` : `${h}A`));
}
function formatDay(d: string) { return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(d).getDay()]; }
function formatDate(d: string) { return new Date(d).getDate().toString(); }
function formatFullDateTime(d: string) { return new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
function formatFullDate(d: string) { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }

function computeWindow(rangeKey: RangeKey, offset: number) {
  const now = new Date();
  const windowSize = rangeKey === '30d' ? 30 : rangeKey === '7d' ? 7 : 1;
  const start = startOfDay(addDays(now, offset * windowSize));
  const end = endOfDay(addDays(start, windowSize - 1));
  return { windowStart: start.toISOString(), windowEnd: end.toISOString() };
}

function handleWindowShift(
  rangeKey: RangeKey,
  setOffset: (updater: (n: number) => number) => void,
  delta: number,
) {
  const windowSize = rangeKey === '30d' ? 30 : rangeKey === '7d' ? 7 : 1;
  const limitForward = 0;
  setOffset(current => {
    const next = current + delta;
    // Prevent going into the future
    if (next > limitForward) return current;
    return next;
  });
}

function formatWindowLabel(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    const today = new Date();
    if (start.toDateString() === today.toDateString()) return 'Today';
    return start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildChartConfig(daily: any[], metric: MetricKey, rangeKey: RangeKey | 'day', suffix?: string): ChartConfig {
  const isToday = rangeKey === 'today';
  const labelForDate = (iso: string) =>
    isToday ? formatHour(iso) : rangeKey === '7d' ? formatDay(iso) : formatDate(iso);
  const fullLabelForDate = (iso: string) =>
    isToday ? formatFullDateTime(iso) : formatFullDate(iso);

  const pointMap = (getter: (d: any) => number) =>
    daily.map(d => ({
      value: getter(d),
      label: labelForDate(d.date),
      fullLabel: fullLabelForDate(d.date),
    }));

  const narrow = rangeKey === '30d';
  const barWidth = narrow ? 10 : 24;
  const spacing = narrow ? 12 : 20;

  if (metric === 'sleep') {
    const stacked = daily.map(d => {
      const awake = d.sleepAwakeMinutes ?? 0;
      const rem = d.sleepRemMinutes ?? 0;
      const deep = d.sleepDeepMinutes ?? 0;
      const coreFallback = Math.max((d.sleepMinutes ?? 0) - (awake + rem + deep), 0);
      const core = d.sleepCoreMinutes ?? coreFallback;
      return {
        label: labelForDate(d.date),
        fullLabel: fullLabelForDate(d.date),
        stacks: [
          { value: awake, color: '#f97316', label: 'Awake' },
          { value: rem, color: '#a855f7', label: 'REM' },
          { value: core, color: '#38bdf8', label: 'Core' },
          { value: deep, color: '#0ea5e9', label: 'Deep' },
        ],
      };
    });
    return {
      kind: 'stacked',
      data: stacked,
      barWidth,
      spacing,
      legend: [
        { label: 'Awake', color: '#f97316' },
        { label: 'REM', color: '#a855f7' },
        { label: 'Core', color: '#38bdf8' },
        { label: 'Deep', color: '#0ea5e9' },
      ],
    };
  }

  if (metric === 'heart') {
    return {
      kind: 'line',
      data: pointMap(d => d.averageHeartRate ?? 0),
      color: '#22c55e',
      fillColor: '#16a34a',
      spacing: narrow ? 36 : 48,
      showDots: true,
    };
  }

  if (metric === 'bp') {
    return {
      kind: 'dual-line',
      data: pointMap(d => d.bloodPressureSystolic ?? 0),
      data2: pointMap(d => d.bloodPressureDiastolic ?? 0),
      color: '#22c55e',
      color2: '#60a5fa',
      spacing: narrow ? 36 : 46,
    };
  }

  if (metric === 'temperature') {
    const temps = pointMap(d => d.bodyTemperatureC ?? 0);
    const nonZero = temps.map(p => p.value).filter(v => v > 0);
    const baseline = nonZero.length ? average(nonZero) : 0;
    const deviations = temps.map(p => ({ ...p, value: p.value ? p.value - baseline : 0 }));
    return {
      kind: 'deviation',
      data: deviations,
      color: '#f59e0b',
      baseline,
      spacing: narrow ? 36 : 46,
    };
  }

  if (metric === 'oxygen') {
    return {
      kind: 'line',
      data: pointMap(d => d.oxygenSaturationPercent ?? 0),
      color: '#38bdf8',
      fillColor: '#0ea5e9',
      spacing: narrow ? 36 : 46,
      showDots: true,
    };
  }

  if (metric === 'respiratory') {
    return {
      kind: 'line',
      data: pointMap(d => d.respiratoryRate ?? 0),
      color: '#a78bfa',
      spacing: narrow ? 36 : 46,
      showDots: true,
    };
  }

  if (metric === 'weight') {
    return {
      kind: 'line',
      data: pointMap(d => d.weightKg ?? 0),
      color: '#f97316',
      spacing: narrow ? 36 : 46,
      showDots: true,
    };
  }

  const colorMap: Record<MetricKey, { color: string; gradient: string }> = {
    steps: { color: '#ef4444', gradient: '#f97316' },
    calories: { color: '#f97316', gradient: '#fb923c' },
    distance: { color: '#22c55e', gradient: '#4ade80' },
    active: { color: '#60a5fa', gradient: '#38bdf8' },
    sleep: { color: '#38bdf8', gradient: '#0ea5e9' },
    heart: { color: '#22c55e', gradient: '#16a34a' },
    bp: { color: '#22c55e', gradient: '#22c55e' },
    glucose: { color: '#f59e0b', gradient: '#fbbf24' },
    temperature: { color: '#f59e0b', gradient: '#fbbf24' },
    oxygen: { color: '#38bdf8', gradient: '#0ea5e9' },
    respiratory: { color: '#a78bfa', gradient: '#c084fc' },
    weight: { color: '#f97316', gradient: '#fb923c' },
  };

  const barData = pointMap(d => getMetricValue(d, metric) ?? 0);
  return {
    kind: 'bar',
    data: barData,
    color: colorMap[metric].color,
    gradient: colorMap[metric].gradient,
    barWidth,
    spacing,
  };
}

function getMetricValue(entry: any, metric: MetricKey): number | undefined {
  switch (metric) {
    case 'steps': return entry.steps;
    case 'calories': return entry.calories;
    case 'distance': return entry.distanceKm;
    case 'sleep': return entry.sleepMinutes != null ? entry.sleepMinutes / 60 : undefined;
    case 'active': return entry.activeMinutes;
    case 'heart': return entry.averageHeartRate;
    case 'bp': return entry.bloodPressureSystolic;
    case 'glucose': return entry.bloodGlucoseMgPerDl;
    case 'temperature': return entry.bodyTemperatureC;
    case 'oxygen': return entry.oxygenSaturationPercent;
    case 'respiratory': return entry.respiratoryRate;
    case 'weight': return entry.weightKg;
    default: return undefined;
  }
}

function addSuffix(value: string, suffix?: string) {
  if (!value) return '--';
  return suffix ? `${value} ${suffix}` : value;
}

function formatMetricValue(value: number | undefined, metric: MetricKey, suffix?: string) {
  if (value == null) return '--';
  let formatted = value.toString();
  if (metric === 'distance') {
    formatted = value.toFixed(2);
  } else if (metric === 'sleep') {
    formatted = value.toFixed(1);
  } else if (['calories', 'heart', 'active', 'oxygen', 'respiratory', 'glucose', 'weight'].includes(metric)) {
    formatted = value.toFixed(0);
  }
  return addSuffix(formatted, suffix);
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !isNaN(v);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
