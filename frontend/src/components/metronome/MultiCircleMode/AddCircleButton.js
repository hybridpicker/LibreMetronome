import React from 'react';

const AddCircleButton = ({ addCircle, containerSize, isMobile }) => {
  return (
    <div
      onClick={addCircle}
      style={{
        position: "relative",
        width: containerSize,
        height: containerSize,
        margin: isMobile ? "15px 0" : "15px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "pointer",
        transition: "all 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)"
      }}
    >
      <div
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "#00A0A0",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#fff",
          fontSize: "36px",
          fontWeight: "bold",
          boxShadow: "0 0 8px rgba(0, 160, 160, 0.5)"
        }}
      >
        +
      </div>
    </div>
  );
};

export default AddCircleButton;