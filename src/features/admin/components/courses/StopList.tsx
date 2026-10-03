// 코스 장소 목록: 끌어서 놓기(마우스 · 터치 · 키보드 Space → 화살표 → Space)로 순서를 바꾼다
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type Collision,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StopCard, type StopPatch } from "./StopCard";
import type { CuratedStop } from "@/shared/domain/types";

// 키보드로 옮길 때 sortableKeyboardCoordinates 는 위로는 윗변을, 아래로는 아랫변을 맞춰 준다.
// 펼친 칸처럼 높이가 다르면 가운데 기준(closestCenter)은 제자리를 고르므로, 키보드는 맞춘 변이 가장 가까운 칸을 고른다.
const closestEdge: CollisionDetection = ({ collisionRect, droppableRects, droppableContainers }) =>
  droppableContainers
    .flatMap((c): Collision[] => {
      const r = droppableRects.get(c.id);
      if (!r) return [];
      const value = Math.min(
        Math.abs(r.top - collisionRect.top),
        Math.abs(r.bottom - collisionRect.bottom),
      );
      return [{ id: c.id, data: { droppableContainer: c, value } }];
    })
    .sort((a, b) => Number(a.data?.value) - Number(b.data?.value));
const collision: CollisionDetection = (args) =>
  args.pointerCoordinates ? closestCenter(args) : closestEdge(args);

export function StopList({
  stops,
  courseId,
  openId,
  onToggle,
  onChange,
  onBusy,
}: {
  stops: CuratedStop[];
  courseId: string;
  openId: string | null;
  onToggle: (id: string) => void;
  /** 다른 칸을 덮어쓰지 않게 최신 목록을 받아 고친다. 그 장소가 이미 없으면 목록을 그대로 돌려준다 */
  onChange: (fn: (stops: CuratedStop[]) => CuratedStop[]) => void;
  onBusy: (delta: 1 | -1) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const nth = (id: string | number) => {
    const i = stops.findIndex((s) => s.id === id);
    return i < 0 ? "" : `${String(i + 1)}번 장소`;
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `${nth(active.id)} 순서를 바꿔요. 화살표로 옮기고 Space로 놓아요`,
    onDragOver: ({ over }) => (over ? `${nth(over.id)} 자리예요` : "놓을 자리가 없어요"),
    onDragEnd: ({ over }) => (over ? `${nth(over.id)} 자리로 옮겼어요` : "그대로 두었어요"),
    onDragCancel: () => "옮기기를 그만뒀어요",
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange((list) => {
      const from = list.findIndex((s) => s.id === active.id);
      const to = list.findIndex((s) => s.id === over.id);
      return from < 0 || to < 0 ? list : arrayMove(list, from, to);
    });
  };

  if (stops.length === 0) {
    return (
      <p className="text-muted-foreground border-input rounded-2xl border border-dashed px-4 py-8 text-center text-sm">
        아직 고른 장소가 없어요. 지도에서 회색 + 점이나 빈 곳을 눌러 장소를 넣어 주세요.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Space나 Enter로 집고, 위아래 화살표로 옮긴 뒤 다시 Space로 놓아요. Esc로 그만둬요.",
        },
      }}
    >
      <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ol className="flex flex-col gap-2" aria-label="코스 순서">
          {stops.map((s, i) => (
            <StopCard
              key={s.id}
              stop={s}
              index={i}
              count={stops.length}
              courseId={courseId}
              open={openId === s.id}
              onToggle={() => {
                onToggle(s.id);
              }}
              onBusy={onBusy}
              onPatch={(fn: StopPatch) => {
                onChange((list) =>
                  list.some((x) => x.id === s.id)
                    ? list.map((x) => (x.id === s.id ? { ...x, ...fn(x) } : x))
                    : list,
                );
              }}
              onMove={(d) => {
                onChange((list) => {
                  const from = list.findIndex((x) => x.id === s.id);
                  const to = from + d;
                  return from < 0 || to < 0 || to >= list.length ? list : arrayMove(list, from, to);
                });
              }}
              onRemove={() => {
                onChange((list) =>
                  list.some((x) => x.id === s.id) ? list.filter((x) => x.id !== s.id) : list,
                );
              }}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
