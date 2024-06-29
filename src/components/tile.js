import React from 'react';
import './tile.css';

const Tile = ({ value }) => {
    return (
        <div className="tile">
            {value !== 0 ? value : ''}
        </div>
    );
};

export default Tile;
