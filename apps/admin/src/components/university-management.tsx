import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Edit, Trash2, Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface University {
  id: string;
  name: string;
  domain: string;
  country: string;
  type: 'public' | 'private' | 'community';
  status: 'active' | 'inactive' | 'pending';
  prefixes: string[];
  departments: string[];
  faculties: string[];
  academic_year_format: string;
  email_format: string;
  verification_required: boolean;
  max_students: number;
  current_students: number;
  established_year: number;
  website: string;
  contact_email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  timezone: string;
  language: string;
  accreditation: string[];
  partnerships: string[];
  features: {
    allowFaculty: boolean;
    allowStaff: boolean;
    allowAlumni: boolean;
    requirePrefix: boolean;
    requireAcademicYear: boolean;
    allowMultipleEmails: boolean;
    enableGeographicValidation: boolean;
    enableFraudDetection: boolean;
  };
  metadata: {
    lastVerified: string;
    verificationSource: string;
    notes: string;
    tags: string[];
    priority: number;
  };
  created_at: string;
  updated_at: string;
}

interface FraudAttempt {
  id: string;
  email: string;
  ip_address: string;
  reason: string;
  timestamp: string;
  user_agent?: string;
  country?: string;
  city?: string;
  is_blocked: boolean;
  risk_score: number;
  metadata?: Record<string, any>;
}

interface BlocklistEntry {
  id: string;
  identifier: string;
  ip_address: string;
  reason: string;
  timestamp: string;
  blocked_by: string;
  is_active: boolean;
  unblocked_at?: string;
}

export const UniversityManagement: React.FC = () => {
  const [universities, setUniversities] = useState<University[]>([]);
  const [fraudAttempts, setFraudAttempts] = useState<FraudAttempt[]>([]);
  const [blocklistEntries, setBlocklistEntries] = useState<BlocklistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [newUniversity, setNewUniversity] = useState<Partial<University>>({});

  // Fetch universities
  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/universities');
      if (!response.ok) throw new Error('Failed to fetch universities');
      const data = await response.json();
      setUniversities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Fetch fraud attempts
  const fetchFraudAttempts = async () => {
    try {
      const response = await fetch('/api/admin/fraud-attempts');
      if (!response.ok) throw new Error('Failed to fetch fraud attempts');
      const data = await response.json();
      setFraudAttempts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Fetch blocklist entries
  const fetchBlocklistEntries = async () => {
    try {
      const response = await fetch('/api/admin/blocklist');
      if (!response.ok) throw new Error('Failed to fetch blocklist entries');
      const data = await response.json();
      setBlocklistEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  useEffect(() => {
    fetchUniversities();
    fetchFraudAttempts();
    fetchBlocklistEntries();
  }, []);

  // Filter universities based on search and filters
  const filteredUniversities = universities.filter(uni => {
    const matchesSearch = uni.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         uni.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = selectedCountry === 'all' || uni.country === selectedCountry;
    const matchesType = selectedType === 'all' || uni.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || uni.status === selectedStatus;
    
    return matchesSearch && matchesCountry && matchesType && matchesStatus;
  });

  // Add new university
  const handleAddUniversity = async () => {
    try {
      const response = await fetch('/api/admin/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUniversity)
      });
      
      if (!response.ok) throw new Error('Failed to add university');
      
      await fetchUniversities();
      setIsAddDialogOpen(false);
      setNewUniversity({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Update university
  const handleUpdateUniversity = async () => {
    if (!editingUniversity) return;
    
    try {
      const response = await fetch(`/api/admin/universities/${editingUniversity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUniversity)
      });
      
      if (!response.ok) throw new Error('Failed to update university');
      
      await fetchUniversities();
      setIsEditDialogOpen(false);
      setEditingUniversity(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Delete university
  const handleDeleteUniversity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this university?')) return;
    
    try {
      const response = await fetch(`/api/admin/universities/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete university');
      
      await fetchUniversities();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Unblock entry
  const handleUnblock = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/blocklist/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to unblock entry');
      
      await fetchBlocklistEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">University Management</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add University
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="universities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="universities">Universities</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Attempts</TabsTrigger>
          <TabsTrigger value="blocklist">Blocklist</TabsTrigger>
        </TabsList>

        <TabsContent value="universities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>University List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    placeholder="Search universities..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Countries</SelectItem>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                      <SelectItem value="CN">China</SelectItem>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="BR">Brazil</SelectItem>
                      <SelectItem value="ZA">South Africa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUniversities.map((uni) => (
                    <TableRow key={uni.id}>
                      <TableCell className="font-medium">{uni.name}</TableCell>
                      <TableCell>{uni.domain}</TableCell>
                      <TableCell>{uni.country}</TableCell>
                      <TableCell>
                        <Badge variant={uni.type === 'public' ? 'default' : 'secondary'}>
                          {uni.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={uni.status === 'active' ? 'default' : 'destructive'}>
                          {uni.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{uni.current_students.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUniversity(uni);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUniversity(uni.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fraud Attempts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fraudAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>{attempt.email}</TableCell>
                      <TableCell>{attempt.ip_address}</TableCell>
                      <TableCell>{attempt.reason}</TableCell>
                      <TableCell>
                        <Badge variant={attempt.risk_score >= 80 ? 'destructive' : 'secondary'}>
                          {attempt.risk_score}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {attempt.is_blocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : (
                          <Badge variant="secondary">Logged</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(attempt.timestamp).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocklist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Blocklist</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Identifier</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Blocked By</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blocklistEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.identifier}</TableCell>
                      <TableCell>{entry.ip_address}</TableCell>
                      <TableCell>{entry.reason}</TableCell>
                      <TableCell>{entry.blocked_by}</TableCell>
                      <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnblock(entry.id)}
                        >
                          Unblock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add University Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New University</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newUniversity.name || ''}
                  onChange={(e) => setNewUniversity({ ...newUniversity, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={newUniversity.domain || ''}
                  onChange={(e) => setNewUniversity({ ...newUniversity, domain: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Select
                  value={newUniversity.country || ''}
                  onValueChange={(value) => setNewUniversity({ ...newUniversity, country: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                    <SelectItem value="BR">Brazil</SelectItem>
                    <SelectItem value="ZA">South Africa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newUniversity.type || ''}
                  onValueChange={(value) => setNewUniversity({ ...newUniversity, type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="community">Community</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={newUniversity.website || ''}
                onChange={(e) => setNewUniversity({ ...newUniversity, website: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={newUniversity.contact_email || ''}
                onChange={(e) => setNewUniversity({ ...newUniversity, contact_email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newUniversity.metadata?.notes || ''}
                onChange={(e) => setNewUniversity({
                  ...newUniversity,
                  metadata: { ...newUniversity.metadata, notes: e.target.value }
                })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUniversity}>
                Add University
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit University Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit University</DialogTitle>
          </DialogHeader>
          {editingUniversity && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editingUniversity.name}
                    onChange={(e) => setEditingUniversity({ ...editingUniversity, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-domain">Domain</Label>
                  <Input
                    id="edit-domain"
                    value={editingUniversity.domain}
                    onChange={(e) => setEditingUniversity({ ...editingUniversity, domain: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-country">Country</Label>
                  <Select
                    value={editingUniversity.country}
                    onValueChange={(value) => setEditingUniversity({ ...editingUniversity, country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="GB">United Kingdom</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                      <SelectItem value="AU">Australia</SelectItem>
                      <SelectItem value="DE">Germany</SelectItem>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="JP">Japan</SelectItem>
                      <SelectItem value="CN">China</SelectItem>
                      <SelectItem value="IN">India</SelectItem>
                      <SelectItem value="BR">Brazil</SelectItem>
                      <SelectItem value="ZA">South Africa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-type">Type</Label>
                  <Select
                    value={editingUniversity.type}
                    onValueChange={(value) => setEditingUniversity({ ...editingUniversity, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  value={editingUniversity.website}
                  onChange={(e) => setEditingUniversity({ ...editingUniversity, website: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-contact_email">Contact Email</Label>
                <Input
                  id="edit-contact_email"
                  type="email"
                  value={editingUniversity.contact_email}
                  onChange={(e) => setEditingUniversity({ ...editingUniversity, contact_email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingUniversity.metadata?.notes || ''}
                  onChange={(e) => setEditingUniversity({
                    ...editingUniversity,
                    metadata: { ...editingUniversity.metadata, notes: e.target.value }
                  })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateUniversity}>
                  Update University
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
