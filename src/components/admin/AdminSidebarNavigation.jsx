import { useState } from "react";
import { ChevronDown } from "lucide-react";
import "../../styles/admin/admin-navigation.css";

const ADMIN_NAV_LAYOUT = [
  { type: "item", section: "overview" },
  {
    type: "group",
    id: "people",
    label: "Người dùng",
    icon: "users",
    children: [
      { section: "users", label: "Tài khoản" },
      { section: "patient-profiles" },
      { section: "doctors", label: "Hồ sơ bác sĩ" },
    ],
  },
  {
    type: "group",
    id: "medical-catalog",
    label: "Danh mục y tế",
    icon: "departments",
    children: [
      { section: "departments" },
      { section: "icd-chapters" },
      { section: "clinical-questions" },
      { section: "consultation-checklists" },
      { section: "lab-indicators" },
    ],
  },
  { type: "item", section: "facilities" },
  { type: "item", section: "subscriptions", label: "Gói & thanh toán" },
  { type: "item", section: "ai-configs" },
];

function getSectionFromItem(item) {
  return item?.id?.replace("admin.", "") ?? "";
}

function getActiveGroupId(activeSection) {
  return ADMIN_NAV_LAYOUT.find(
    (entry) => entry.type === "group"
      && entry.children.some((child) => child.section === activeSection),
  )?.id ?? "";
}

export default function AdminSidebarNavigation({
  activeSection,
  iconMap,
  items,
  onOpenSection,
}) {
  const itemsBySection = Object.fromEntries(
    items.map((item) => [getSectionFromItem(item), item]),
  );
  const activeGroupId = getActiveGroupId(activeSection);
  const [expandedGroups, setExpandedGroups] = useState(() => (
    activeGroupId ? [activeGroupId] : []
  ));

  function toggleGroup(groupId) {
    setExpandedGroups((current) => (
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    ));
  }

  return ADMIN_NAV_LAYOUT.map((entry) => {
    if (entry.type === "group") {
      const GroupIcon = iconMap[entry.icon];
      const isExpanded = expandedGroups.includes(entry.id) || entry.id === activeGroupId;
      const hasActiveChild = entry.children.some(
        (child) => child.section === activeSection,
      );
      const submenuId = `admin-nav-submenu-${entry.id}`;

      return (
        <div
          className={`admin-nav-group ${hasActiveChild ? "has-active" : ""}`}
          key={entry.id}
        >
          <button
            className="admin-nav-group-toggle"
            type="button"
            aria-expanded={isExpanded}
            aria-controls={submenuId}
            onClick={() => toggleGroup(entry.id)}
          >
            <span className="admin-nav-icon">
              {GroupIcon ? <GroupIcon size={17} aria-hidden="true" /> : null}
            </span>
            <span className="admin-nav-group-label">{entry.label}</span>
            <ChevronDown
              className="admin-nav-chevron"
              size={17}
              aria-hidden="true"
            />
          </button>

          <div
            className="admin-nav-submenu"
            id={submenuId}
            hidden={!isExpanded}
          >
            {entry.children.map((child) => {
              const item = itemsBySection[child.section];
              if (!item) return null;

              const isActive = activeSection === child.section;
              return (
                <button
                  className={`admin-nav-child ${isActive ? "active" : ""}`}
                  type="button"
                  key={child.section}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onOpenSection(child.section)}
                >
                  <span className="admin-nav-child-indicator" aria-hidden="true" />
                  <span>{child.label ?? item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    const item = itemsBySection[entry.section];
    if (!item) return null;

    const Icon = iconMap[item.icon];
    const isActive = activeSection === entry.section;

    return (
      <button
        className={`admin-nav-primary ${isActive ? "active" : ""}`}
        type="button"
        key={entry.section}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onOpenSection(entry.section)}
      >
        <span className="admin-nav-icon">
          {Icon ? <Icon size={17} aria-hidden="true" /> : null}
        </span>
        <span>{entry.label ?? item.label}</span>
      </button>
    );
  });
}
