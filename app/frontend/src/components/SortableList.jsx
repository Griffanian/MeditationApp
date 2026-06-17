import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

export default function SortableList({ ids, children }) {
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      {children}
    </SortableContext>
  );
}
