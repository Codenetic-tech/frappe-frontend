import * as React from "react";
import { Check, ChevronRight, ChevronDown, Search, X } from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

const CATEGORY_ORDER: Record<string, number> = {
  'ZONE': 1,
  'REGION': 2,
  'BRANCH': 3,
  'RM': 4,
  'AP': 5,
  'U-AP': 6,
  'CLIENT': 7
};

const getPriority = (category?: string) => {
  if (!category) return 99;
  return CATEGORY_ORDER[category.toUpperCase()] || 99;
};

interface HierarchyNode {
  name: string;
  parent_gopocket_tree: string | null;
  category?: string;
  is_group?: number;
  label?: string; // Compatibility
}

interface FlatNode extends HierarchyNode {
  id: string;
  level: number;
  isExpanded: boolean;
  isVisible: boolean;
  hasChildren: boolean;
}

interface VirtualizedTreeProps {
  data: HierarchyNode[];
  onChange?: (selectedIds: string[]) => void;
  placeholder?: string;
  className?: string;
  value?: string[];
}

const Scroller = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ children, ...props }, ref) => (
    <ScrollAreaPrimitive.Root className="relative overflow-hidden h-full">
      <ScrollAreaPrimitive.Viewport
        {...props}
        ref={ref}
        className="h-full w-full rounded-[inherit]"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
);
Scroller.displayName = "Scroller";

export const VirtualizedTree = ({
  data,
  onChange,
  placeholder = "Search...",
  className,
  value = [],
}: VirtualizedTreeProps) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set(value || []));

  // Sync selectedIds with props value
  React.useEffect(() => {
    setSelectedIds(new Set(value || []));
  }, [value]);

  // Pre-process data into a map for fast lookups
  const nodesMap = React.useMemo(() => {
    const map = new Map<string, HierarchyNode & { children: string[] }>();
    data.forEach((node) => {
      map.set(node.name, { ...node, children: [] });
    });
    data.forEach((node) => {
      if (node.parent_gopocket_tree && map.has(node.parent_gopocket_tree)) {
        map.get(node.parent_gopocket_tree)!.children.push(node.name);
      }
    });

    // Sort children based on category priority and then name
    map.forEach((node) => {
      node.children.sort((a, b) => {
        const priorityA = getPriority(map.get(a)?.category);
        const priorityB = getPriority(map.get(b)?.category);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.localeCompare(b);
      });
    });

    return map;
  }, [data]);

  const roots = React.useMemo(() => {
    const rootNodes = data.filter((node) => !node.parent_gopocket_tree || !nodesMap.has(node.parent_gopocket_tree));

    return rootNodes
      .sort((a, b) => {
        const priorityA = getPriority(a.category);
        const priorityB = getPriority(b.category);
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.name.localeCompare(b.name);
      })
      .map(n => n.name);
  }, [data, nodesMap]);

  // Handle Search and Filtering
  const filteredNodes = React.useMemo(() => {
    if (!search) return null;
    const lowerSearch = search.toLowerCase();
    const result = new Set<string>();

    // Find matching nodes and their ancestors
    data.forEach(node => {
      if (node.name.toLowerCase().includes(lowerSearch)) {
        let curr: string | null = node.name;
        while (curr && !result.has(curr)) {
          result.add(curr);
          curr = nodesMap.get(curr)?.parent_gopocket_tree || null;
        }
      }
    });
    return result;
  }, [search, data, nodesMap]);

  // Generate the visible flat list
  const visibleNodes = React.useMemo(() => {
    const list: FlatNode[] = [];

    const stack: { id: string; level: number }[] = [...roots].reverse().map(id => ({ id, level: 0 }));

    while (stack.length > 0) {
      const { id, level } = stack.pop()!;
      const node = nodesMap.get(id);
      if (!node) continue;

      const isMatch = !filteredNodes || filteredNodes.has(id);

      if (isMatch) {
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedIds.has(id) || !!search; // Auto-expand all when searching

        list.push({
          ...node,
          id,
          level,
          isExpanded,
          isVisible: true,
          hasChildren,
        });

        if (isExpanded && hasChildren) {
          // Push children in reverse to maintain order in stack
          for (let i = node.children.length - 1; i >= 0; i--) {
            stack.push({ id: node.children[i], level: level + 1 });
          }
        }
      }
    }
    return list;
  }, [roots, nodesMap, expandedIds, filteredNodes, search]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    const node = nodesMap.get(id);
    if (!node) return;

    const isCurrentlySelected = selectedIds.has(id);

    const updateRecursive = (nodeId: string, select: boolean) => {
      if (select) newSelected.add(nodeId);
      else newSelected.delete(nodeId);

      const n = nodesMap.get(nodeId);
      n?.children.forEach(childId => updateRecursive(childId, select));
    };

    updateRecursive(id, !isCurrentlySelected);

    const selectedArray = Array.from(newSelected);
    setSelectedIds(newSelected);
    onChange?.(selectedArray);
  };

  const getCategoryStyles = (category?: string) => {
    switch (category?.toUpperCase()) {
      case 'ZONE': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'REGION': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'BRANCH': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'RM': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'AP': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'U-AP': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
      case 'CLIENT': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {selectedIds.size > 0
              ? `${selectedIds.size} branches selected`
              : placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="flex flex-col h-[400px]">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full border-0 focus-visible:ring-0 px-2"
            />
            {search && (
              <X
                className="h-4 w-4 cursor-pointer opacity-50 hover:opacity-100"
                onClick={() => setSearch("")}
              />
            )}
          </div>

          <div className="flex-1 min-h-0">
            {visibleNodes.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No branches found.
              </div>
            ) : (
              <Virtuoso
                style={{ height: "100%" }}
                totalCount={visibleNodes.length}
                components={{ Scroller }}
                itemContent={(index) => {
                  const node = visibleNodes[index];
                  return (
                    <div
                      className={cn(
                        "flex items-center px-2 py-1.5 hover:bg-accent cursor-pointer group",
                        selectedIds.has(node.id) && "bg-accent/50"
                      )}
                      style={{ paddingLeft: `${node.level * 30 + 8}px` }}
                      onClick={() => toggleSelect(node.id)}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div
                          className="h-4 w-4 flex items-center justify-center rounded-sm hover:bg-accent-foreground/10"
                          onClick={(e) => node.hasChildren && toggleExpand(node.id, e)}
                        >
                          {node.hasChildren && !search && (
                            node.isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
                          )}
                        </div>
                        <Checkbox
                          checked={selectedIds.has(node.id)}
                          onCheckedChange={() => toggleSelect(node.id)}
                          className="h-4 w-4"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm truncate">{node.name}</span>
                        {node.category && (
                          <Badge
                            variant="outline"
                            className={cn("text-[8px] px-1 py-0 h-3.5 uppercase font-bold", getCategoryStyles(node.category))}
                          >
                            {node.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
            )}
          </div>

          {selectedIds.size > 0 && (
            <div className="border-t p-2 flex items-center justify-between bg-muted/50 rounded-b-lg">
              <span className="text-xs font-medium">{selectedIds.size} selected</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setSelectedIds(new Set());
                  onChange?.([]);
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
