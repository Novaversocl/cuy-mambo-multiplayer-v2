class CollisionDetector {
  static checkCollision(rect1, rect2) {
    return (
      rect1.left < rect2.right &&
      rect1.right > rect2.left &&
      rect1.top < rect2.bottom &&
      rect1.bottom > rect2.top
    );
  }

  static checkElementCollision(element1, element2) {
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();
    
    return CollisionDetector.checkCollision(rect1, rect2);
  }

  static isPointInside(point, rect) {
    return (
      point.x >= rect.left &&
      point.x <= rect.right &&
      point.y >= rect.top &&
      point.y <= rect.bottom
    );
  }

  static getOverlapArea(rect1, rect2) {
    const overlapLeft = Math.max(rect1.left, rect2.left);
    const overlapRight = Math.min(rect1.right, rect2.right);
    const overlapTop = Math.max(rect1.top, rect2.top);
    const overlapBottom = Math.min(rect1.bottom, rect2.bottom);

    if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
      return {
        width: overlapRight - overlapLeft,
        height: overlapBottom - overlapTop,
        area: (overlapRight - overlapLeft) * (overlapBottom - overlapTop)
      };
    }

    return null;
  }

  static getDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static isCircleCollision(circle1, circle2) {
    const distance = CollisionDetector.getDistance(circle1.center, circle2.center);
    return distance < (circle1.radius + circle2.radius);
  }
}

export { CollisionDetector };