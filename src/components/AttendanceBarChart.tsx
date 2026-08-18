import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type AttendanceChartPoint = {
  month: string;
  month_label: string;
  total_sessions: string | number;
  total_present: string | number;
};

const MAX_BAR_HEIGHT = 100;
const MONTHS_TO_SHOW = 5;
const EMPTY_BAR_COLOR = '#E5E7EB';

function barColor(percentage: number) {
  if (percentage >= 80) return '#10B981';
  if (percentage >= 50) return '#F59E0B';
  return '#EF4444';
}

// Selalu tampilkan MONTHS_TO_SHOW bulan terakhir, apa pun isi `data` —
// bulan yang tidak ada datanya diisi batang abu-abu minimal, bukan
// dihilangkan, supaya layout & skala visual tetap konsisten di semua kartu
// (lihat pola yang sama di web: components/pages/ParentViewPage.tsx).
function buildPaddedPoints(data: AttendanceChartPoint[]): AttendanceChartPoint[] {
  const byMonth = new Map(data.map((d) => [d.month, d]));
  const points: AttendanceChartPoint[] = [];
  const now = new Date();

  for (let i = MONTHS_TO_SHOW - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('id-ID', { month: 'short' });
    points.push(byMonth.get(key) || { month: key, month_label: label, total_sessions: 0, total_present: 0 });
  }
  return points;
}

export default function AttendanceBarChart({ data }: { data: AttendanceChartPoint[] }) {
  const points = buildPaddedPoints(data || []);

  return (
    <View style={styles.chartOuter}>
      <View style={[styles.gridline, { top: 0 }]} />
      <View style={[styles.gridline, { top: MAX_BAR_HEIGHT / 2 }]} />
      <View style={styles.chartRow}>
        {points.map((point) => {
          const total = Number(point.total_sessions) || 0;
          const present = Number(point.total_present) || 0;
          const hasData = total > 0;
          const percentage = hasData ? Math.round((present / total) * 100) : 0;
          const barHeight = hasData ? Math.max((percentage / 100) * MAX_BAR_HEIGHT, 4) : 4;

          return (
            <View key={point.month} style={styles.barColumn}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    { height: barHeight, backgroundColor: hasData ? barColor(percentage) : EMPTY_BAR_COLOR },
                  ]}
                />
              </View>
              <Text style={styles.monthLabel}>{point.month_label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartOuter: {
    position: 'relative',
    paddingTop: 8,
  },
  gridline: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: MAX_BAR_HEIGHT,
    width: 18,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 18,
    borderRadius: 6,
  },
  monthLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '600',
  },
});
