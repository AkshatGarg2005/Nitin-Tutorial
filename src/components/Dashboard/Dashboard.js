import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getAttendancePercentage, formatDate, getInitials } from '../../utils/helpers';
import toast from 'react-hot-toast';
import {
  HiOutlineDocumentText, HiOutlineCalendar, HiOutlineAcademicCap,
  HiOutlineCurrencyRupee, HiOutlineUsers, HiOutlineClipboardCheck,
  HiOutlineLogout,
} from 'react-icons/hi';
import './Dashboard.css';

export default function Dashboard() {
  const { currentUser, userProfile, isTeacher, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    attendancePercent: 0,
    totalTests: 0,
    totalCourses: 0,
    totalAttendanceRecords: 0,
    pendingFees: 0,
    recentTests: [],
    batchNames: [],
    courseNames: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    loadStats();
  }, [currentUser, isTeacher]);

  async function loadStats() {
    try {
      if (isTeacher) {
        // Teacher stats
        const [usersSnap, feesSnap, testsSnap, attendanceSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
          getDocs(query(collection(db, 'fees'), where('paid', '==', false))),
          getDocs(collection(db, 'testReports')),
          getDocs(collection(db, 'attendance')),
        ]);

        setStats({
          totalStudents: usersSnap.size,
          pendingFees: feesSnap.size,
          totalTests: testsSnap.size,
          totalAttendanceRecords: attendanceSnap.size,
          totalCourses: 0,
          attendancePercent: 0,
          recentTests: [],
        });
      } else {
        // Student stats
        const testSnap = await getDocs(
          query(
            collection(db, 'testReports'),
            where('studentId', '==', currentUser.uid),
            orderBy('testDate', 'desc'),
            limit(5)
          )
        );
        const recentTests = testSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const attendanceSnap = await getDocs(
          query(collection(db, 'attendance'), where('studentId', '==', currentUser.uid))
        );
        const totalAttendance = attendanceSnap.size;
        const presentCount = attendanceSnap.docs.filter((d) => d.data().present).length;
        const attendancePercent = getAttendancePercentage(presentCount, totalAttendance);

        const feesSnap = await getDocs(
          query(
            collection(db, 'fees'),
            where('studentId', '==', currentUser.uid),
            where('paid', '==', false)
          )
        );

        const totalCourses = (userProfile?.courseIds || []).length;

        // Fetch batch names
        const batchIds = userProfile?.batchIds || [];
        const batchNames = [];
        for (const bid of batchIds) {
          try {
            const bSnap = await getDoc(doc(db, 'batches', bid));
            if (bSnap.exists()) batchNames.push(bSnap.data().name);
          } catch (e) { /* skip */ }
        }

        // Fetch course names
        const courseIds = userProfile?.courseIds || [];
        const courseNames = [];
        for (const cid of courseIds) {
          try {
            const cSnap = await getDoc(doc(db, 'courses', cid));
            if (cSnap.exists()) courseNames.push(cSnap.data().name);
          } catch (e) { /* skip */ }
        }

        setStats({
          totalStudents: 0,
          attendancePercent,
          totalTests: testSnap.size,
          totalCourses,
          totalAttendanceRecords: 0,
          pendingFees: feesSnap.size,
          recentTests,
          batchNames,
          courseNames,
        });
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
      toast.success('Logged out');
    } catch {
      toast.error('Failed to log out');
    }
  }

  if (loading) {
    return (
      <div className="spinner-overlay">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header dashboard-header">
        <div className="dashboard-header-top">
          <div className="dashboard-user">
            <div className="avatar avatar-lg">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.name} />
              ) : (
                getInitials(userProfile?.name)
              )}
            </div>
            <div>
              <p style={{ opacity: 0.8, fontSize: '0.8125rem' }}>
                {isTeacher ? 'Welcome, Teacher' : 'Welcome back'}
              </p>
              <h1>{userProfile?.name || 'User'}</h1>
              {!isTeacher && (stats.batchNames.length > 0 || stats.courseNames.length > 0) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {stats.batchNames.map((name, i) => (
                    <span key={'b' + i} style={{
                      fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)',
                      fontWeight: 500, letterSpacing: '0.2px',
                    }}>
                      📦 {name}
                    </span>
                  ))}
                  {stats.courseNames.map((name, i) => (
                    <span key={'c' + i} style={{
                      fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)',
                      fontWeight: 500, letterSpacing: '0.2px',
                    }}>
                      🎓 {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button className="btn-icon mobile-logout" onClick={handleLogout} title="Log out" id="mobile-logout">
            <HiOutlineLogout style={{ color: 'rgba(255,255,255,0.8)' }} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid stagger-list">
        {isTeacher ? (
          <>
            <div className="stat-card" onClick={() => navigate('/students')}>
              <div className="stat-icon" style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}>
                <HiOutlineUsers />
              </div>
              <div className="stat-value">{stats.totalStudents}</div>
              <div className="stat-label">Students</div>
            </div>
            <div className="stat-card" onClick={() => navigate('/attendance/mark')}>
              <div className="stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
                <HiOutlineClipboardCheck />
              </div>
              <div className="stat-value">{stats.totalAttendanceRecords}</div>
              <div className="stat-label">Attendance</div>
            </div>
            <div className="stat-card" onClick={() => navigate('/tests/add')}>
              <div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                <HiOutlineDocumentText />
              </div>
              <div className="stat-value">{stats.totalTests}</div>
              <div className="stat-label">Tests</div>
            </div>
            <div className="stat-card" onClick={() => navigate('/fees/manage')}>
              <div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
                <HiOutlineCurrencyRupee />
              </div>
              <div className="stat-value">{stats.pendingFees}</div>
              <div className="stat-label">Pending Fees</div>
            </div>
          </>
        ) : (
          <>
            <div className="stat-card" onClick={() => navigate('/attendance')}>
              <div className="stat-icon" style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}>
                <HiOutlineCalendar />
              </div>
              <div className="stat-value">{stats.attendancePercent}%</div>
              <div className="stat-label">Attendance</div>
            </div>
            <div className="stat-card" onClick={() => navigate('/tests')}>
              <div className="stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)' }}>
                <HiOutlineDocumentText />
              </div>
              <div className="stat-value">{stats.totalTests}</div>
              <div className="stat-label">Tests</div>
            </div>
            <div className="stat-card" onClick={() => navigate('/courses')}>
              <div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
                <HiOutlineAcademicCap />
              </div>
              <div className="stat-value">{stats.totalCourses}</div>
              <div className="stat-label">Courses</div>
            </div>
            <div className="stat-card" onClick={() => navigate('/fees')}>
              <div className="stat-icon" style={{
                background: stats.pendingFees > 0 ? 'var(--danger-light)' : 'var(--success-light)',
                color: stats.pendingFees > 0 ? 'var(--danger)' : 'var(--success)',
              }}>
                <HiOutlineCurrencyRupee />
              </div>
              <div className="stat-value">{stats.pendingFees > 0 ? stats.pendingFees : '✓'}</div>
              <div className="stat-label">{stats.pendingFees > 0 ? 'Pending' : 'Fees Clear'}</div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions for teacher */}
      {isTeacher && (
        <div className="section-title">
          <h2>Quick Actions</h2>
        </div>
      )}
      {isTeacher && (
        <div className="quick-actions stagger-list">
          <div className="list-card" onClick={() => navigate('/attendance/mark')}>
            <div className="stat-icon" style={{ background: 'var(--green-100)', color: 'var(--green-700)', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiOutlineClipboardCheck />
            </div>
            <div className="list-card-content">
              <h4>Mark Attendance</h4>
              <p>Record today's attendance</p>
            </div>
          </div>
          <div className="list-card" onClick={() => navigate('/tests/add')}>
            <div className="stat-icon" style={{ background: 'var(--info-light)', color: 'var(--info)', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiOutlineDocumentText />
            </div>
            <div className="list-card-content">
              <h4>Add Test Report</h4>
              <p>Enter test results</p>
            </div>
          </div>
          <div className="list-card" onClick={() => navigate('/batches')}>
            <div className="stat-icon" style={{ background: 'var(--warning-light)', color: 'var(--warning)', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HiOutlineUsers />
            </div>
            <div className="list-card-content">
              <h4>Manage Batches</h4>
              <p>Create & assign batches</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Test Reports (Student) */}
      {!isTeacher && stats.recentTests.length > 0 && (
        <>
          <div className="section-title">
            <h2>Recent Tests</h2>
            <button className="btn btn-sm btn-secondary" onClick={() => navigate('/tests')}>View All</button>
          </div>
          <div className="stagger-list">
            {stats.recentTests.map((test) => {
              const pct = test.totalMarks ? Math.round((test.obtainedMarks / test.totalMarks) * 100) : 0;
              return (
                <div className="list-card" key={test.id}>
                  <div className="stat-icon" style={{
                    background: pct >= 60 ? 'var(--green-100)' : pct >= 40 ? 'var(--warning-light)' : 'var(--danger-light)',
                    color: pct >= 60 ? 'var(--green-700)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)',
                    width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                  }}>
                    {pct}%
                  </div>
                  <div className="list-card-content">
                    <h4>{test.subjectName}</h4>
                    <p>{test.obtainedMarks}/{test.totalMarks} • {formatDate(test.testDate)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
