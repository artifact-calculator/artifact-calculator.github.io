import React, { useState, cloneElement, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

export default function Tooltip({ children }) {
  const [tooltip, setTooltip] = useState({ content: null, visible: false, x: 0, y: 0, opacity: 0 });
  const tooltipRef = useRef(null);
  const targetRef = useRef(null); // Ref to the target element

  const handleMouseEnter = (event, content, target) => {
    targetRef.current = target;
    setTooltip({
      content,
      visible: true,
      x: event.clientX,
      y: event.clientY + 10,
      opacity: 0,
    });

    setTimeout(() => {
      setTooltip((prev) => ({ ...prev, opacity: 1 }));
    }, 50);
  };

  const handleMouseMove = (event) => {
    if (!tooltip.visible) return;

    const tooltipWidth = tooltipRef.current ? tooltipRef.current.offsetWidth : 0;
    const tooltipHeight = tooltipRef.current ? tooltipRef.current.offsetHeight : 0;

    let x = event.clientX;
    let y = event.clientY + 10;

    if ((tooltipWidth/2)+10 > event.clientX) {
      x += (tooltipWidth/2)+10 - event.clientX; // Смещаем влево

    }


   

    if (y + tooltipHeight > window.innerHeight) {
      y = event.clientY - tooltipHeight - 10;
    }
//console.log([tooltipWidth,tooltipHeight,window.innerWidth,window.innerHeight,x,y])
    setTooltip((prev) => ({
      ...prev,
      x,
      y,
    }));
  };

  const handleMouseLeave = () => {
    // Hide the tooltip when the mouse leaves the target element
    setTooltip((prev) => ({ ...prev, opacity: 0 }));
    setTimeout(() => {
      setTooltip({ content: null, visible: false, x: 0, y: 0, opacity: 0 });
    }, 200);
  };

  const checkMousePosition = (event) => {
    const tooltipElement = tooltipRef.current;
    const targetElement = targetRef.current;

    if (!tooltip.visible || !tooltipElement || !targetElement) return;

    const tooltipRect = tooltipElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    // Check if mouse is within the bounds of the tooltip or target element
    const isMouseInside =
      (event.clientX >= targetRect.left && event.clientX <= targetRect.right &&
       event.clientY >= targetRect.top && event.clientY <= targetRect.bottom);

    if (!isMouseInside) {
      // Hide tooltip if mouse is outside both elements
      setTooltip((prev) => ({ ...prev, opacity: 0 }));
      setTimeout(() => {
        setTooltip({ content: null, visible: false, x: 0, y: 0, opacity: 0 });
      }, 200);
    }
  };

  useEffect(() => {
    // Add mousemove event listener to check mouse position
    window.addEventListener('mousemove', checkMousePosition);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('mousemove', checkMousePosition);
    };
  }, [tooltip.visible]);

  return (
    <>
      {React.Children.map(children, (child) =>
        child.props.tooltip
          ? cloneElement(child, {
			   ref: targetRef,
              onMouseEnter: (e) => handleMouseEnter(e, child.props.tooltip, e.currentTarget),
              onMouseMove: handleMouseMove,
              onMouseLeave: handleMouseLeave,
            })
          : child
      )}

      {tooltip.visible &&
        createPortal(
          <div
            ref={tooltipRef}
            className="tooltip"
            onMouseLeave={handleMouseLeave} // Add mouse leave handler for tooltip
            style={{
              position: "fixed",
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              transform: "translateX(-50%)",
              pointerEvents: "none",
              background: "black",
              color: "white",
              padding: "5px",
              borderRadius: "5px",
              zIndex: 99999,
              opacity: tooltip.opacity,
              transition: "opacity 0.2s ease-in-out",
            }}
          >
            {tooltip.content}
          </div>,
          document.body
        )}
    </>
  );
}
