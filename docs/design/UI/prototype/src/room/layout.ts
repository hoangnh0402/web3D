// Bố cục phòng, dùng chung cho công cụ dựng ảnh nền (tools/bake-room.ts) và cảnh chạy trên web.

// Máy quay đặt ngang tầm mắt người tham vấn đang ngồi, chếch sang trái so với thân chủ.
// Máy chỉ xoay tại chỗ, nhờ vậy toàn bộ căn phòng tính sẵn được thành một ảnh nền duy nhất.
export const CAM: [number, number, number] = [-.72, 1.14, 1.5];
export const LOOK: [number, number, number] = [.03, 1.0, -1.6];

// Ảnh nền là một phối cảnh rộng hơn mọi góc nhìn có thể xoay tới
export const PLATE = { hfov: 86, vfov: 76 };

export const SOFA = { x: .42, z: -1.46, yaw: -.2 };
// Đổi tọa độ trên sofa (sang phải, về phía trước) ra tọa độ phòng
export const onSofa = (side: number, front: number) => ({
  x: SOFA.x + side * Math.cos(SOFA.yaw) + front * Math.sin(SOFA.yaw),
  z: SOFA.z - side * Math.sin(SOFA.yaw) + front * Math.cos(SOFA.yaw),
});
// Thân chủ ngồi lệch về một bên sofa, chừa chỗ cho gối ở bên kia
export const SEAT = { ...onSofa(-.26, -.1), yaw: SOFA.yaw };
export const SEAT_HIP: [number, number, number] = [0, .5, 0];

export const ROOM = { left: -3.2, right: 3.2, back: -2.6, front: 4.1, height: 2.8, wall: .16 };
export const WINDOW = { x: -1.5, y: 1.5, w: 1.9, h: 2.1 };
export const SIDE_WINDOW = { z: .6, y: 1.5, w: 2.4, h: 2.1 };
export const TABLE = { x: -.82, z: -1.24 };
