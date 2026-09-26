"use client";

import type { ReactNode } from "react";
import { GanttChart as ProjectGanttChart } from "./GanttChart";
import { OverviewTab } from "./OverviewTab";
import { GanttTab } from "./GanttTab";
import { TaskBoardTab } from "./TaskBoardTab";
import { WorkforceTab } from "./WorkforceTab";
import { EquipmentTab } from "./EquipmentTab";
import { DocumentsTab } from "./DocumentsTab";
import { DailyLogsTab } from "./DailyLogsTab";
import { WorkAttachmentsTab } from "./WorkAttachmentsTab";
import { SituationsTab } from "./SituationsTab";
import { MetresTab } from "./MetresTab";
import { MaterialsTab } from "./MaterialsTab";
import { PurchaseOrdersTab } from "./PurchaseOrdersTab";
import type { Project, ProjectDocument, ProjectTask } from "@/lib/types/projects";
import type { ProjectSection } from "@/lib/projects/sections";

export type ProjectWithJoins = Project & {
  project_documents: ProjectDocument[];
  tasks: ProjectTask[];
};

type Props = {
  sectionId: ProjectSection["id"];
  project: ProjectWithJoins;
  isAr: boolean;
  canManageProjects: boolean;
  onRefresh: () => void;
};

/**
 * محتوى قسم واحد — مصدر واحد للحقيقة، تستهلكه كل من:
 *  - العرض المضمّن داخل /projects/[id]
 *  - صفحة القسم المستقلة /projects/[id]/<segment>
 * أي تعديل في تبويب يجب أن يبقى متطابقاً في المسارين.
 */
export function ProjectSectionContent({
  sectionId,
  project,
  isAr,
  canManageProjects,
  onRefresh,
}: Props): ReactNode {
  switch (sectionId) {
    case "overview":
      return <OverviewTab project={project} isAr={isAr} onRefresh={onRefresh} />;
    case "daily-logs":
      return <DailyLogsTab project={project} isAr={isAr} onRefresh={onRefresh} />;
    case "metres":
      return <MetresTab project={project} isAr={isAr} />;
    case "work-attachments":
      return <WorkAttachmentsTab project={project} isAr={isAr} />;
    case "situations":
      return <SituationsTab project={project} isAr={isAr} />;
    case "tasks":
      return <TaskBoardTab project={project} isAr={isAr} />;
    case "gantt":
      return (
        <div className="min-h-60">
          {canManageProjects ? (
            <ProjectGanttChart projectId={project.id} isAr={isAr} />
          ) : (
            <GanttTab project={project} isAr={isAr} />
          )}
        </div>
      );
    case "workforce":
      return <WorkforceTab project={project} isAr={isAr} />;
    case "resources":
      return <EquipmentTab project={project} isAr={isAr} />;
    case "materials":
      return <MaterialsTab project={project} isAr={isAr} />;
    case "orders":
      return <PurchaseOrdersTab project={project} isAr={isAr} />;
    case "documents":
      return <DocumentsTab project={project} isAr={isAr} />;
    default:
      return null;
  }
}
