import React from 'react';
import { useSelector } from 'react-redux';
import { useNotifications } from '../hooks/useNotifications';
import { RootState } from '../store';

const NotificationWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useSelector((state: RootState) => state.user.currentUser);

  // Initialize notifications if user is logged in
  useNotifications(user?.id || null);

  return <>{children}</>;
};

export default NotificationWrapper;
