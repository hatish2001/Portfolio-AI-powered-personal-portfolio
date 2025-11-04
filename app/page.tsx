'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { HeroEnhanced } from '@/components/HeroEnhanced';
import { ProjectsGrid } from '@/components/ProjectsGrid';
import { EducationSection } from '@/components/EducationSection';
import { ExperienceRow } from '@/components/ExperienceRow';
import { ImpactSection } from '@/components/ImpactSection';
import { DetailModal } from '@/components/DetailModal';
import { Footer } from '@/components/Footer';
import { contentData } from '@/lib/data';
import { trackEvent } from '@/lib/analytics';
import type { ContentItem, ContentSection } from '@/types/content';

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Track page view
  useEffect(() => {
    trackEvent({ name: 'view_home' });
  }, []);

  // Use all apps for hero carousel
  const heroApps = contentData.apps;

  // Handle modal state from URL
  useEffect(() => {
    const modalParam = searchParams.get('modal');
    if (modalParam) {
      const [section, id] = modalParam.split(':');
      const items = contentData[section as ContentSection];
      if (items && Array.isArray(items)) {
        const item = items.find((item: any) => item.id === id);
        if (item) {
          setSelectedItem(item);
          setModalOpen(true);
        }
      }
    } else {
      setModalOpen(false);
      setSelectedItem(null);
    }
  }, [searchParams]);

  const handleItemClick = useCallback((item: ContentItem, section: ContentSection) => {
    trackEvent({ name: 'open_modal', section, id: item.id });
    const params = new URLSearchParams(searchParams.toString());
    params.set('modal', `${section}:${item.id}`);
    router.push(`/?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleModalClose = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('modal');
    router.push(params.toString() ? `/?${params.toString()}` : '/', { scroll: false });
  }, [router, searchParams]);

  // Remove hobbies section - focusing on professional content only

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        {heroApps.length > 0 && (
          <HeroEnhanced 
            items={heroApps} 
            onViewDetails={(item) => handleItemClick(item, 'apps')}
          />
        )}

        {/* Quantified Impact Section */}
        <ImpactSection />

        {/* Projects Section */}
        <ProjectsGrid
          items={contentData.apps}
          onItemClick={(item) => handleItemClick(item, 'apps')}
        />

        {/* Experience Section */}
        <ExperienceRow
          items={contentData.experience}
          onItemClick={(item) => handleItemClick(item, 'experience')}
        />

        {/* Education Section */}
        <EducationSection
          items={contentData.education}
          onItemClick={(item) => handleItemClick(item, 'education')}
        />
      </main>

      <Footer />

      {/* Detail Modal */}
      <DetailModal
        item={selectedItem}
        open={modalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
