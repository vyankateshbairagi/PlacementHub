'use client';

import React from 'react';
import StitchDashboardShell from '@/components/layout/StitchDashboardShell';
import CurriculumCreatorStudio from '@/components/curriculum/CurriculumCreatorStudio';

export default function CurriculumManagementPage() {
  return (
    <StitchDashboardShell
      activePath="/curriculum"
      title="Curriculum & Assessment Creator Studio"
      roleOverride="TPO"
    >
      <div className="max-w-[1440px] mx-auto p-4 sm:p-6">
        <CurriculumCreatorStudio roleTitle="Placement Cell & Academic Board" />
      </div>
    </StitchDashboardShell>
  );
}
