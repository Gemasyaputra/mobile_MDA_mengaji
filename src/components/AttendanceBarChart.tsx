import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type AttendanceChartPoint = {
  month: string;
  month_label: string;
  total_sessions: string | number;
  total_present: string | number;
};

const MAX_BAR_HEIGHT = 90;

function barColor(percentage: number) {
  if (percentage >= 80) return '#10B981';
  if (percentage >= 50) return '#F59E0B';
  return '#EF4444';
}

export default function AttendanceBarChart({ data }: { data: AttendanceChartPoint[] }) {
  if (!data || data.length === 0) {
    return <Text style={styles.emptyText}>Belum ada data kehadiran untuk ditampilkan.</Text>;
  }

  return (
    <View style={styles.chartRow}>
      {data.map((point) => {
        const total = Number(point.total_sessions) || 0;
        const present = Number(point.total_present) || 0;
        const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
        const barHeight = total > 0 ? Math.max((percentage / 100) * MAX_BAR_HEIGHT, 4) : 4;

        return (
          <View key={point.month} style={styles.barColumn}>
            <Text style={styles.percentageLabel}>{total > 0 ? `${percentage}%` : '-'}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: barHeight, backgroundColor: barColor(percentage) }]} />
            </View>
            <Text style={styles.monthLabel}>{point.month_label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  percentageLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6B7280',
    marginBottom: 4,
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
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
