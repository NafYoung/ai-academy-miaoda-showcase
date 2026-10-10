import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import HomePage from './pages/HomePage/HomePage';
import CategoryPage from './pages/CategoryPage/CategoryPage';
import AcademyCoursePage from './pages/AcademyCoursePage/AcademyCoursePage';
import CourseCenterPage from './pages/CourseCenterPage/CourseCenterPage';
import SubmissionPage from './pages/SubmissionPage/SubmissionPage';
import MyLearningPage from './pages/MyLearningPage/MyLearningPage';
import CourseManagementDetailPage from './pages/CourseManagementPage/CourseManagementDetailPage';
import IdentityCheckPage from './pages/IdentityCheckPage/IdentityCheckPage';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './components/AdminLayout';
import DocumentAuthorizationPage from './pages/DocumentAuthorizationPage/DocumentAuthorizationPage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route
        path="document-authorization"
        element={<DocumentAuthorizationPage />}
      />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="courses" element={<CourseCenterPage />} />
        <Route path="courses/:id" element={<AcademyCoursePage />} />
        <Route path="categories/:id" element={<CategoryPage />} />
        <Route path="academy-course/:id" element={<AcademyCoursePage />} />
        <Route path="submit" element={<SubmissionPage />} />
        <Route path="my-learning" element={<MyLearningPage />} />
        <Route path="identity-check" element={<IdentityCheckPage />} />
        <Route
          path="quiz-management"
          element={<Navigate to="/admin/course-management" replace />}
        />
        <Route
          path="admin"
          element={
            <AdminRoute allowCourseManagers>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={null} />
          <Route path="course-management" element={null} />
          <Route
            path="course-management/:courseId"
            element={<CourseManagementDetailPage />}
          />
        </Route>
        <Route
          path="admin/quiz-management"
          element={<Navigate to="/admin/course-management" replace />}
        />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
