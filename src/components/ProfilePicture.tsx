import React from 'react';

interface ProfilePictureProps {
  userId: number;
  userName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ProfilePicture: React.FC<ProfilePictureProps> = ({ 
  userId, 
  userName, 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} rounded-lg overflow-hidden bg-gray-600 flex-shrink-0 ${className}`}>
      <img
        src={`http://localhost:5000/profile/profile-image/${userId}`}
        alt={`${userName} profile`}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to default profile image or placeholder
          const target = e.target as HTMLImageElement;
          target.src = `http://localhost:5000/profile/profile-image/default`;
        }}
      />
    </div>
  );
};

export default ProfilePicture;
