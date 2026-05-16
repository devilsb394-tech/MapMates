import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

/**
 * Triggered when a new notification is created in Firestore.
 * Sends a push notification to the receiver's FCM token.
 */
export const sendPushNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const notification = snapshot.data();
    if (!notification) return;

    // Only send push for messages or specific types if needed
    // The user requested push for messages
    if (notification.type !== 'message') return;

    const receiverUid = notification.uid;
    
    try {
      // Get receiver's FCM token from their user document
      const userDoc = await admin.firestore().collection('users').doc(receiverUid).get();
      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;

      if (!fcmToken) {
        console.log(`No FCM token found for user: ${receiverUid}`);
        return;
      }

      // Construct the push notification message
      const message: admin.messaging.Message = {
        notification: {
          title: notification.fromName,
          body: notification.text,
        },
        android: {
          notification: {
            imageUrl: notification.fromPhoto,
            clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Or your app's intent
          },
        },
        apns: {
          payload: {
            aps: {
              mutableContent: true,
              contentAvailable: true,
            },
          },
          fcmOptions: {
            imageUrl: notification.fromPhoto,
          },
        },
        webpush: {
          notification: {
            icon: notification.fromPhoto || '/logo.png',
            image: notification.fromPhoto,
            click_action: 'https://ais-dev-g2i5h7d3xle34gsurcmq7f-695372742205.asia-southeast1.run.app', // App URL
          },
          fcmOptions: {
            link: 'https://ais-dev-g2i5h7d3xle34gsurcmq7f-695372742205.asia-southeast1.run.app',
          },
        },
        data: {
          type: notification.type,
          fromId: notification.fromId,
          url: '/chat', // Navigation hint
        },
        token: fcmToken,
      };

      // Send the message via FCM
      const response = await admin.messaging().send(message);
      console.log('Successfully sent push notification:', response);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  });
