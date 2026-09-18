import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';

import {CustomButton} from '../CustomButton';
import {COLORS, FONTS} from '../../constants';
import {IncomingJob} from '../../types';
import {formatCareDateTime} from '../../utils/formatCareTime';

type Props = {
  job: IncomingJob;
  variant: 'incoming' | 'active';
  busy?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onPickup?: () => void;
  onCall?: () => void;
  onChat?: () => void;
};

const THEME = COLORS.primary;

export function CareServiceCard({
  job,
  variant,
  busy,
  onAccept,
  onDecline,
  onPickup,
  onCall,
  onChat,
}: Props) {
  const when = formatCareDateTime(job.scheduledAt) || 'Upcoming';
  const rating =
    job.customerRating != null ? job.customerRating.toFixed(1) : null;
  const ratingLabel =
    rating && job.customerRatingCount != null
      ? `${rating} (${job.customerRatingCount})`
      : rating;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          {job.customerImage ? (
            <Image source={{uri: job.customerImage}} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={22} color={THEME} />
          )}
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.name} allowFontScaling={false} numberOfLines={1}>
            {job.customerName || 'Patient'}
          </Text>
          {variant === 'active' && ratingLabel ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color="#F5A623" />
              <Text style={styles.rating} allowFontScaling={false}>
                {ratingLabel}
              </Text>
            </View>
          ) : null}
        </View>
        {variant === 'incoming' && rating ? (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F5A623" />
            <Text style={styles.rating} allowFontScaling={false}>
              {rating}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.dashedLine} />

      {variant === 'incoming' ? (
        <View style={styles.metaRow}>
          <Text style={styles.metaText} allowFontScaling={false}>
            {when}
          </Text>
          {job.distanceKm != null ? (
            <View style={styles.distanceRow}>
              <Ionicons name="location" size={14} color={THEME} />
              <Text style={styles.metaText} allowFontScaling={false}>
                {job.distanceKm} km
              </Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.metaRow}>
          <View style={styles.actionIcons}>
            <Pressable style={styles.circleIcon} onPress={onChat}>
              <Ionicons name="chatbubble-outline" size={18} color={THEME} />
            </Pressable>
            <Pressable style={styles.circleIcon} onPress={onCall}>
              <Ionicons name="call-outline" size={18} color={THEME} />
            </Pressable>
          </View>
          <Text style={styles.metaText} allowFontScaling={false}>
            {when}
          </Text>
        </View>
      )}

      <View style={styles.routeBox}>
        <View style={styles.routeRow}>
          <Ionicons name="location" size={18} color={THEME} />
          <Text style={styles.routeText} allowFontScaling={false}>
            {job.address || 'Pickup location'}
          </Text>
        </View>
        {job.dropAddress ? (
          <>
            <View style={styles.routeConnector} />
            <View style={styles.routeRow}>
              <Ionicons name="navigate" size={18} color={THEME} />
              <Text style={styles.routeText} allowFontScaling={false}>
                {job.dropAddress}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {variant === 'incoming' ? (
        <View style={styles.buttonRow}>
          <Pressable
            style={styles.acceptButton}
            onPress={onAccept}
            disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.acceptText} allowFontScaling={false}>
                Accept Service
              </Text>
            )}
          </Pressable>
          <Pressable
            style={styles.declineButton}
            onPress={onDecline}
            disabled={busy}>
            <Text style={styles.declineText} allowFontScaling={false}>
              Decline
            </Text>
          </Pressable>
        </View>
      ) : (
        <CustomButton
          title="Pickup Customer"
          onPress={onPickup ?? (() => undefined)}
          loading={busy}
          disabled={busy}
          style={styles.pickupButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 6},
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E7F4F8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  headerCopy: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: '#1F2937',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  rating: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#4B5563',
  },
  dashedLine: {
    marginTop: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D6DEE6',
    borderStyle: 'dashed',
    height: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: '#4B5563',
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: THEME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeBox: {
    backgroundColor: '#EAF3F7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  routeConnector: {
    width: 1,
    height: 14,
    marginLeft: 8,
    marginVertical: 4,
    borderLeftWidth: 1,
    borderColor: THEME,
    borderStyle: 'dashed',
  },
  routeText: {
    flex: 1,
    fontFamily: FONTS.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#1F2937',
  },
  buttonRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: THEME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  declineButton: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: THEME,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: THEME,
  },
  pickupButton: {
    marginTop: 14,
    height: 50,
    borderRadius: 10,
  },
});
