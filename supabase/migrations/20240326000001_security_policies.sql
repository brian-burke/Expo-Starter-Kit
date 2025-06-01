-- -- User Profiles policies
-- create policy "Users can view their own profile"
--   on user_profiles for select
--   using (auth.uid() = id);

-- create policy "Users can update their own profile"
--   on user_profiles for update
--   using (auth.uid() = id);

-- -- User Links policies
-- create policy "Users can view their own links"
--   on user_links for select
--   using (auth.uid() = user_id or auth.uid() = linked_user_id);

-- create policy "Users can create their own links"
--   on user_links for insert
--   with check (auth.uid() = user_id);

-- create policy "Users can update their own links"
--   on user_links for update
--   using (auth.uid() = user_id);

-- create policy "Users can delete their own links"
--   on user_links for delete
--   using (auth.uid() = user_id);

-- -- Folders policies
-- create policy "Users can view folders they have access to"
--   on folders for select
--   using (
--     auth.uid() = created_by or
--     exists (
--       select 1 from folder_users
--       where folder_users.folder_id = folders.id
--       and folder_users.user_id = auth.uid()
--     )
--   );

-- create policy "Users can create folders"
--   on folders for insert
--   with check (auth.uid() = created_by);

-- create policy "Owners can update their folders"
--   on folders for update
--   using (auth.uid() = created_by);

-- create policy "Owners can delete their folders"
--   on folders for delete
--   using (auth.uid() = created_by);

-- -- Folder Users policies
-- create policy "Users can view folder permissions"
--   on folder_users for select
--   using (
--     exists (
--       select 1 from folders
--       where folders.id = folder_users.folder_id
--       and (
--         folders.created_by = auth.uid() or
--         exists (
--           select 1 from folder_users fu
--           where fu.folder_id = folder_users.folder_id
--           and fu.user_id = auth.uid()
--         )
--       )
--     )
--   );

-- create policy "Folder owners can manage permissions"
--   on folder_users for all
--   using (
--     exists (
--       select 1 from folders
--       where folders.id = folder_users.folder_id
--       and folders.created_by = auth.uid()
--     )
--   );

-- -- Photos policies
-- create policy "Users can view photos they have access to"
--   on photos for select
--   using (
--     auth.uid() = uploaded_by or
--     exists (
--       select 1 from folder_users
--       where folder_users.folder_id = photos.folder_id
--       and folder_users.user_id = auth.uid()
--       and folder_users.can_view = true
--     ) or
--     exists (
--       select 1 from photo_links
--       where photo_links.photo_id = photos.id
--       and photo_links.user_id = auth.uid()
--     )
--   );

-- create policy "Users can upload photos to folders they have access to"
--   on photos for insert
--   with check (
--     auth.uid() = uploaded_by and
--     (
--       exists (
--         select 1 from folders
--         where folders.id = folder_id
--         and folders.created_by = auth.uid()
--       ) or
--       exists (
--         select 1 from folder_users
--         where folder_users.folder_id = folder_id
--         and folder_users.user_id = auth.uid()
--         and folder_users.can_upload = true
--       )
--     )
--   );

-- create policy "Uploaders can update their photos"
--   on photos for update
--   using (auth.uid() = uploaded_by);

-- create policy "Uploaders can delete their photos"
--   on photos for delete
--   using (auth.uid() = uploaded_by);

-- -- Photo Links policies
-- create policy "Users can view photo links they're involved with"
--   on photo_links for select
--   using (
--     auth.uid() = user_id or
--     exists (
--       select 1 from photos
--       where photos.id = photo_links.photo_id
--       and photos.uploaded_by = auth.uid()
--     )
--   );

-- create policy "Photo owners can create links"
--   on photo_links for insert
--   with check (
--     exists (
--       select 1 from photos
--       where photos.id = photo_id
--       and photos.uploaded_by = auth.uid()
--     )
--   );

-- create policy "Photo owners can delete links"
--   on photo_links for delete
--   using (
--     exists (
--       select 1 from photos
--       where photos.id = photo_id
--       and photos.uploaded_by = auth.uid()
--     )
--   );

-- -- Reminders policies
-- create policy "Users can manage their own reminders"
--   on reminders for all
--   using (auth.uid() = user_id);

-- -- Journals policies
-- create policy "Users can manage their own journals"
--   on journals for all
--   using (auth.uid() = user_id); 

CREATE POLICY "Enable read access for all users" ON "storage"."objects"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for all users" ON "storage"."objects"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON "storage"."objects"
AS PERMISSIVE FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON "storage"."objects"
AS PERMISSIVE FOR DELETE
TO public
USING (true);

CREATE POLICY "Enable read access for all users" ON "storage"."buckets"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for all users " ON "storage"."buckets"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON "storage"."buckets"
AS PERMISSIVE FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON "storage"."buckets"
AS PERMISSIVE FOR DELETE
TO public
USING (true);