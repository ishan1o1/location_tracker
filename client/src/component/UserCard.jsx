import React from 'react';

const UserCard = ({ user }) => (
    <div className="p-3 bg-blue-500 rounded-2xl text-white">
        <h2 className="text-md font-semibold mb-1 truncate">
            {user.isMe ? 'You' : user.name || 'User'}
        </h2>
        <div className="space-y-1 text-xs text-blue-50">
            {!user.isMe && user.name ? (
                <div>Connected as {user.name}</div>
            ) : null}
            <div className="truncate">Socket ID: {user.userId}</div>
            {user.distance ? (
                <div>
                    Distance: {user.distance} - ETA: {user.eta || 'N/A'}
                </div>
            ) : null}
            {!user.lat || !user.lng ? (
                <div>Waiting for location</div>
            ) : null}
        </div>
    </div>
);

export default UserCard;