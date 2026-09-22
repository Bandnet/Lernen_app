import { Link } from 'react-router-dom';
import type { Topic } from '../types/models';
import { ProgressBar } from './ProgressBar';

export function TopicCard({ topic }: { topic: Topic }) {
  return (
    <Link to={`/topic/${topic.id}`} className="card topic-card" style={{ ['--tc' as string]: topic.color }}>
      <div className="topic-icon">{topic.icon}</div>
      <div className="topic-card-body">
        <div className="topic-card-name">{topic.name}</div>
        {topic.description && <div className="topic-card-desc">{topic.description}</div>}
      </div>
      {topic.progress !== undefined && (
        <div className="topic-card-progress">
          <ProgressBar value={topic.progress} color={topic.color} />
          <span>{Math.round(topic.progress)}%</span>
        </div>
      )}
    </Link>
  );
}
