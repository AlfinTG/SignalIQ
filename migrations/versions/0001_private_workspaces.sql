BEGIN;

CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY,
  owner_user_id uuid NOT NULL UNIQUE,
  name varchar(120) NOT NULL DEFAULT 'My SignalIQ workspace',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS feedback_records (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  text varchar(8000) NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 8000),
  source varchar(80) NOT NULL DEFAULT 'manual',
  source_reference varchar(255),
  submitted_at timestamptz,
  rating numeric(2,1) CHECK (rating IS NULL OR rating BETWEEN 0 AND 5),
  sentiment varchar(20) NOT NULL DEFAULT 'unclassified' CHECK (sentiment IN ('positive','neutral','negative','unclassified')),
  category varchar(120), issue_key varchar(120),
  severity varchar(20) CHECK (severity IS NULL OR severity IN ('low','medium','high','critical','unknown')),
  confidence numeric(4,3) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  analysis_explanation varchar(2000), suggested_action varchar(1000),
  analysis_mode varchar(40) NOT NULL DEFAULT 'unclassified', model_name varchar(160), analysis_version varchar(80), analyzed_at timestamptz,
  is_sample boolean NOT NULL DEFAULT false, import_batch_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS feedback_workspace_submitted_idx ON feedback_records(workspace_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS feedback_workspace_sentiment_idx ON feedback_records(workspace_id, sentiment);
CREATE INDEX IF NOT EXISTS feedback_workspace_issue_idx ON feedback_records(workspace_id, issue_key);

CREATE TABLE IF NOT EXISTS issue_states (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  issue_key varchar(120) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open','In progress','Resolved')),
  notes varchar(2000), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, issue_key)
);
CREATE INDEX IF NOT EXISTS issue_states_workspace_status_idx ON issue_states(workspace_id, status);

CREATE TABLE IF NOT EXISTS analysis_runs (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by uuid NOT NULL, provider varchar(80) NOT NULL, model_name varchar(160), mode varchar(40) NOT NULL,
  status varchar(40) NOT NULL, requested_count integer NOT NULL DEFAULT 0 CHECK (requested_count >= 0),
  processed_count integer NOT NULL DEFAULT 0 CHECK (processed_count >= 0), failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  error_code varchar(80), error_summary varchar(500), started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);

CREATE TABLE IF NOT EXISTS training_examples (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_feedback_id uuid REFERENCES feedback_records(id) ON DELETE SET NULL,
  instruction varchar(2000) NOT NULL, input_text varchar(8000) NOT NULL, target_output varchar(4000) NOT NULL,
  provenance varchar(80) NOT NULL DEFAULT 'user-correction', label_status varchar(20) NOT NULL DEFAULT 'unreviewed' CHECK (label_status IN ('unreviewed','verified','rejected')),
  verified_by uuid, verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS training_examples_workspace_status_idx ON training_examples(workspace_id, label_status);

CREATE TABLE IF NOT EXISTS adaption_jobs (
  id uuid PRIMARY KEY, workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, created_by uuid NOT NULL,
  dataset_id varchar(255), run_id varchar(255), status varchar(60) NOT NULL, phase varchar(60) NOT NULL,
  selected_example_count integer NOT NULL DEFAULT 0 CHECK (selected_example_count >= 0), requested_row_cap integer,
  estimated_credits numeric(12,3), estimated_minutes numeric(12,2), error_summary varchar(500), output_format varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS adaption_jobs_workspace_idx ON adaption_jobs(workspace_id, created_at DESC);

COMMIT;
