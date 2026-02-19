import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    RefreshControl,
    StatusBar,
    Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, AppDispatch } from '@/store';
import { fetchUserProfile, fetchPracticeHistory, updateUserProfile } from '@/store/slices/profileSlice';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const ProfileScreen: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const navigation = useNavigation<any>();
    const { user, history, loading, error } = useSelector((state: RootState) => state.profile);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            await Promise.all([
                dispatch(fetchUserProfile()),
                dispatch(fetchPracticeHistory())
            ]);
        } catch (err) {
            console.error('Failed to load profile data', err);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleUpdateTier = async (newTier: string) => {
        try {
            await dispatch(updateUserProfile({ subscription_tier: newTier } as any)).unwrap();
            Toast.show({
                type: 'success',
                text1: 'Tier Updated',
                text2: `You are now on the ${newTier} plan`,
            });
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Update Failed',
                text2: 'Could not update subscription',
            });
        }
    };

    const handleUpdateSkill = async (newLevel: number) => {
        try {
            await dispatch(updateUserProfile({ skill_level: newLevel })).unwrap();
            Toast.show({
                type: 'success',
                text1: 'Level Updated',
                text2: `You are now Level ${newLevel}`,
            });
        } catch (err) {
            Toast.show({
                type: 'error',
                text1: 'Update Failed',
                text2: 'Could not update skill level',
            });
        }
    };

    if (loading && !refreshing && !user) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
            }
        >
            <StatusBar barStyle="light-content" />

            {/* Header / Profile Info */}
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{user?.display_name?.[0] || user?.username?.[0] || 'U'}</Text>
                </View>
                <Text style={styles.name}>{user?.display_name || user?.username || 'Guitarist'}</Text>
                <Text style={styles.email}>{user?.email}</Text>

                <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>Level {user?.skill_level || 1} Enthusiast</Text>
                </View>
                <View style={[styles.levelBadge, { marginTop: 8, backgroundColor: 'rgba(255, 215, 0, 0.2)', borderColor: '#FFD700' }]}>
                    <Text style={[styles.levelText, { color: '#FFD700' }]}>{(user as any)?.subscription_tier?.toUpperCase() || 'FREE'} PLAN</Text>
                </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>⏱️</Text>
                    <Text style={styles.statValue}>{Math.round((user?.total_practice_time || 0) / 60)}</Text>
                    <Text style={styles.statLabel}>Mins Played</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>🔥</Text>
                    <Text style={styles.statValue}>{user?.consecutive_days || 0}</Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>🎯</Text>
                    <Text style={styles.statValue}>{Math.round(user?.avg_session_accuracy || 0)}%</Text>
                    <Text style={styles.statLabel}>Avg Accuracy</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statEmoji}>🎸</Text>
                    <Text style={styles.statValue}>{user?.songs_learned || 0}</Text>
                    <Text style={styles.statLabel}>Songs Mastered</Text>
                </View>
            </View>

            {/* Subscription Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subscription Plan</Text>
                <View style={styles.card}>
                    <View style={styles.tierButtons}>
                        {['free', 'basic', 'premium'].map((t) => (
                            <TouchableOpacity
                                key={t}
                                style={[
                                    styles.tierButton,
                                    (user as any)?.subscription_tier === t && styles.tierButtonActive
                                ]}
                                onPress={() => handleUpdateTier(t)}
                            >
                                <Text style={[
                                    styles.tierButtonText,
                                    (user as any)?.subscription_tier === t && styles.tierButtonTextActive
                                ]}>{t.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>

            {/* Settings Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skill Settings</Text>
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Current Skill Level</Text>
                    <View style={styles.skillButtons}>
                        {[1, 2, 3, 4, 5].map((lvl) => (
                            <TouchableOpacity
                                key={lvl}
                                style={[
                                    styles.skillButton,
                                    user?.skill_level === lvl && styles.skillButtonActive
                                ]}
                                onPress={() => handleUpdateSkill(lvl)}
                            >
                                <Text style={[
                                    styles.skillButtonText,
                                    user?.skill_level === lvl && styles.skillButtonTextActive
                                ]}>{lvl}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.skillDescription}>
                        {user?.skill_level === 1 ? 'Beginner: Just starting out.' :
                            user?.skill_level === 3 ? 'Intermediate: Can play multiple chords and basic songs.' :
                                user?.skill_level === 5 ? 'Advanced: Skilled in techniques and solos.' : 'Improving your craft every day.'}
                    </Text>
                </View>
            </View>

            {/* History Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Practice</Text>
                {history.length > 0 ? (
                    history.map((session: any) => (
                        <View key={session.session_id} style={styles.historyItem}>
                            <View style={styles.historyInfo}>
                                <Text style={styles.historySong} numberOfLines={1}>{session.song_title}</Text>
                                <Text style={styles.historyDate}>
                                    {new Date(session.start_time).toLocaleDateString()} • {Math.round(session.duration_seconds / 60)} mins
                                </Text>
                            </View>
                            <View style={styles.historyMetric}>
                                <Text style={styles.historyAccuracy}>{Math.round(session.overall_accuracy)}%</Text>
                                <Text style={styles.historyLabel}>Accuracy</Text>
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No sessions recorded yet.</Text>
                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => navigation.navigate('Home' as any)}
                        >
                            <Text style={styles.ctaText}>Start Practicing</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={styles.footerSpacing} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    header: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: SPACING.xl,
        paddingHorizontal: SPACING.lg,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        ...SHADOWS.soft,
    },
    avatarText: {
        fontSize: 40,
        color: COLORS.text,
        fontWeight: 'bold',
    },
    name: {
        ...TYPOGRAPHY.h2,
        color: COLORS.text,
        marginBottom: 4,
    },
    email: {
        ...TYPOGRAPHY.body,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    levelBadge: {
        backgroundColor: 'rgba(78, 205, 196, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.secondary,
    },
    levelText: {
        color: COLORS.secondary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING.lg,
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    statCard: {
        width: (width - SPACING.lg * 2 - SPACING.md) / 2,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        ...SHADOWS.soft,
    },
    statEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    statValue: {
        ...TYPOGRAPHY.h3,
        color: COLORS.text,
    },
    statLabel: {
        ...TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
    },
    section: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        ...TYPOGRAPHY.h3,
        color: COLORS.text,
        marginBottom: SPACING.md,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    cardLabel: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginBottom: SPACING.md,
    },
    skillButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    skillButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    skillButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    skillButtonText: {
        color: COLORS.textSecondary,
        fontWeight: 'bold',
    },
    skillButtonTextActive: {
        color: COLORS.text,
    },
    tierButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    tierButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    tierButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    tierButtonText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
    },
    tierButtonTextActive: {
        color: COLORS.background,
    },
    skillDescription: {
        color: COLORS.textSecondary,
        fontSize: 12,
        lineHeight: 18,
        fontStyle: 'italic',
    },
    historyItem: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
        marginBottom: SPACING.sm,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
    },
    historyInfo: {
        flex: 1,
    },
    historySong: {
        ...TYPOGRAPHY.body,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    historyDate: {
        ...TYPOGRAPHY.caption,
    },
    historyMetric: {
        alignItems: 'flex-end',
    },
    historyAccuracy: {
        color: COLORS.secondary,
        fontWeight: 'bold',
        fontSize: 18,
    },
    historyLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: SPACING.xl,
    },
    emptyText: {
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    ctaButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: BORDER_RADIUS.md,
    },
    ctaText: {
        color: COLORS.text,
        fontWeight: 'bold',
    },
    footerSpacing: {
        height: 100,
    }
});

export default ProfileScreen;
