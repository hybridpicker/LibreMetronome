import React from 'react';

const MultiCircleDebugger = ({ circleSettings, playingCircle, activeCircle }) => {
  // Don't show in production
  const isDevelopment = process.env.NODE_ENV === 'development' || true;
  
  if (!isDevelopment) return null;
  
  return (
    <div className="debug-container" style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
      fontFamily: 'monospace'
    }}>
      <div style={{ marginBottom: '5px', borderBottom: '1px solid #666', paddingBottom: '5px' }}>
        <strong>Multi Circle Debug</strong>
        <button 
          onClick={() => console.log('Circle Settings:', circleSettings)} 
          style={{
            marginLeft: '10px',
            background: '#555',
            border: 'none',
            color: 'white',
            padding: '2px 5px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Log
        </button>
      </div>
      
      <div style={{ marginBottom: '3px' }}>
        <span style={{ color: '#aaa' }}>Total Circles:</span> {circleSettings?.length || 0}
      </div>
      
      <div style={{ marginBottom: '3px' }}>
        <span style={{ color: '#aaa' }}>Playing Circle:</span> 
        <span style={{ color: '#ffcc00', fontWeight: 'bold' }}> {playingCircle}</span>
      </div>
      
      <div style={{ marginBottom: '3px' }}>
        <span style={{ color: '#aaa' }}>Active Circle:</span> 
        <span style={{ color: '#00ccff' }}> {activeCircle}</span>
      </div>
      
      <div style={{ fontSize: '11px', marginTop: '5px', color: '#999' }}>
        Sequence: {circleSettings?.map((_, i) => i).join(' → ')}
      </div>
      
      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'row' }}>
        {circleSettings?.map((_, i) => (
          <div 
            key={i}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              margin: '0 3px',
              backgroundColor: i === playingCircle ? '#ffcc00' : '#333',
              border: i === activeCircle ? '2px solid #00ccff' : '2px solid transparent',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '10px'
            }}
          >
            {i}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiCircleDebugger;