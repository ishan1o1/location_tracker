import React from 'react';

const UserCard = ({ user }) => (
    <div className='p-3 bg-blue-500 rounded-2xl'>
        <h2 className="text-md font-semibold mb-1 truncate">User: {user.userId.slice(0, 15)}...</h2>
        <div>
            {user.distance && (
                <div className="text-xs text-gray-600">
                    {user.distance} • {user.eta}
                </div>
            )}
        </div>
    </div>
);

export default UserCard;