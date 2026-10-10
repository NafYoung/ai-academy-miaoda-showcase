import { Navigate } from 'react-router-dom';

/**
 * Keep historical category URLs usable after the category tables were retired.
 * The course center now owns the complete course list and source filters.
 */
export default function CategoryPage() {
  return <Navigate to="/courses" replace />;
}
