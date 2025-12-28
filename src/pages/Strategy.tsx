import { useProject } from '../contexts/ProjectContext';
import { AlertCircle } from 'lucide-react';
import StrategyBuilder from '../components/StrategyBuilder';

export default function Strategy() {
  const { currentProject } = useProject();

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Project Selected</h2>
          <p className="text-gray-600">Please select a project to access the Strategy Builder.</p>
        </div>
      </div>
    );
  }

  return <StrategyBuilder />;
}
