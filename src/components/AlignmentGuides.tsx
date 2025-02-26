import React from 'react';
import { Line } from 'react-konva';
import { AlignmentGuide } from '../store/alignmentStore';

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
  canvasWidth: number;
  canvasHeight: number;
}

export const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({
  guides,
  canvasWidth,
  canvasHeight,
}) => {
  return (
    <>
      {guides.map((guide, index) => {
        const isVertical = ['left', 'center', 'right'].includes(guide.type);
        
        return (
          <Line
            key={`${guide.type}-${index}`}
            points={
              isVertical
                ? [guide.position, 0, guide.position, canvasHeight]
                : [0, guide.position, canvasWidth, guide.position]
            }
            stroke="#00A0FF"
            strokeWidth={1}
            dash={[4, 4]}
          />
        );
      })}
    </>
  );
}; 