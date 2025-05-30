function importApp() {
    return {
        apiKey: '',
        accountId: '',
        csvData: null,
        csvHeaders: [],
        fieldMappings: {},
        previewData: null,
        previewLimit: 10,
        showingAllPreviewRows: false,
        isDragging: false,
        errorMessage: '',
        keyType: '',
        packages: [],
        accounts: [],
        selectedPackage: '',
        isConnecting: false,
        showApiHelp: false,
        systemFields: [
            'memberNumber',
            'firstName',
            'lastName',
            'emailAddress',
            'phone',
            'address',
            'city',
            'zip',
            'countryCode',
            'region',
            'notes',
            'key'
        ],

        // Watch for account selection changes
        async watchAccountId() {
            if (this.accountId && this.apiKey) {
                try {
                    const formattedApiKey = `Bearer ${this.apiKey.trim()}`;
                    const packagesResponse = await fetch(`https://fabman.io/api/v1/packages?account=${this.accountId}`, {
                        headers: {
                            'Authorization': formattedApiKey
                        }
                    });

                    if (!packagesResponse.ok) {
                        throw new Error('Failed to load packages. Please try again.');
                    }

                    const packagesData = await packagesResponse.json();
                    this.packages = packagesData;
                } catch (error) {
                    console.error('Error loading packages:', error);
                    this.errorMessage = error.message;
                    this.packages = [];
                }
            } else {
                this.packages = [];
            }
        },

        // Common variations of field names
        fieldVariations: {
            'memberNumber': ['member', 'number', 'id', 'member_id', 'memberid', 'member number', 'Member', 'Number', 'ID', 'Member_ID', 'MemberID', 'Member Number', 'member_number', 'user_id', 'userid', 'user id', 'customer_id', 'customerid', 'customer id', 'client_id', 'clientid', 'client id'],
            'firstName': ['first', 'firstname', 'first name', 'given name', 'givenname', 'First', 'FirstName', 'First Name', 'Given Name', 'GivenName', 'first_name', 'given_name', 'fname', 'f_name', 'forename'],
            'lastName': ['last', 'lastname', 'last name', 'surname', 'family name', 'familyname', 'Last', 'LastName', 'Last Name', 'Surname', 'Family Name', 'FamilyName', 'last_name', 'family_name', 'lname', 'l_name'],
            'emailAddress': ['email', 'emailaddress', 'email address', 'mail', 'e-mail', 'Email', 'EmailAddress', 'Email Address', 'Mail', 'E-mail', 'email_address', 'e_mail', 'mailaddress', 'mail_address', 'contact_email', 'email_id'],
            'phone': ['phone', 'telephone', 'tel', 'mobile', 'cell', 'phone number', 'Phone', 'Telephone', 'Tel', 'Mobile', 'Cell', 'Phone Number', 'phone_number', 'telephone_number', 'mobile_number', 'cell_number', 'contact_number', 'phonenumber'],
            'address': ['address', 'street', 'street address', 'Address', 'Street', 'Street Address', 'street_address', 'home_address', 'mailing_address', 'postal_address', 'addr', 'location'],
            'city': ['city', 'town', 'locality', 'City', 'Town', 'Locality', 'municipality', 'urban_area', 'place'],
            'zip': ['zip', 'postal', 'postcode', 'zipcode', 'zip code', 'postal code', 'ZIP', 'Postal', 'Postcode', 'ZIPCode', 'ZIP Code', 'Postal Code', 'zip_code', 'postal_code', 'post_code', 'postalcode'],
            'countryCode': ['country', 'countrycode', 'country code', 'nation', 'Country', 'CountryCode', 'Country Code', 'Nation', 'country_code', 'nation_code', 'nationality', 'iso_country'],
            'region': ['region', 'state', 'province', 'county', 'Region', 'State', 'Province', 'County', 'district', 'territory', 'area', 'zone'],
            'notes': ['notes', 'comment', 'comments', 'description', 'desc', 'Notes', 'Comment', 'Comments', 'Description', 'Desc', 'remarks', 'memo', 'additional_info', 'info', 'details'],
            'key': ['key', 'token', 'rfid', 'card', 'access', 'access key', 'Key', 'Token', 'RFID', 'Card', 'Access', 'Access Key', 'access_key', 'card_number', 'cardnumber', 'badge', 'badge_number', 'badgenumber', 'fob', 'tag']
        },

        get hasKeyMapping() {
            return Object.values(this.fieldMappings).includes('key');
        },

        // Check if there are any validation errors that would prevent preview generation
        get previewValidationErrors() {
            const errors = [];
            
            // Check required field mappings
            const requiredFields = ['firstName', 'lastName', 'emailAddress'];
            const missingFields = requiredFields.filter(field => 
                !Object.values(this.fieldMappings).includes(field)
            );
            
            if (missingFields.length > 0) {
                errors.push(`Missing required fields: ${missingFields.join(', ')}`);
            }
            
            // Check key type selection if key is mapped
            if (this.hasKeyMapping && !this.keyType) {
                errors.push('Key type must be selected when a key field is mapped');
            }
            
            return errors;
        },

        get canGeneratePreview() {
            return this.csvData && this.previewValidationErrors.length === 0;
        },

        get hasMorePreviewRows() {
            return this.csvData && this.csvData.length > this.previewLimit && !this.showingAllPreviewRows;
        },

        get totalRowsCount() {
            return this.csvData ? this.csvData.length : 0;
        },

        get currentPreviewCount() {
            return this.previewData ? this.previewData.length : 0;
        },

        // Helper function to normalize strings for comparison
        normalizeString(str) {
            return str.toLowerCase()
                .replace(/[^a-z0-9]/g, '') // Remove special characters
                .trim();
        },

        // Helper function to check if strings are similar
        areStringsSimilar(str1, str2) {
            const normalized1 = this.normalizeString(str1);
            const normalized2 = this.normalizeString(str2);
            
            // Direct match
            if (normalized1 === normalized2) {
                return true;
            }
            
            // Check if one contains the other (for partial matches)
            if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
                return true;
            }
            
            // Check variations for the specific field we're comparing against
            const variations = this.fieldVariations[str2];
            if (variations) {
                return variations.some(variation => {
                    const normalizedVariation = this.normalizeString(variation);
                    return normalizedVariation === normalized1 || 
                           normalized1.includes(normalizedVariation) || 
                           normalizedVariation.includes(normalized1);
                });
            }
            
            return false;
        },

        // Auto-match fields based on similarity
        autoMatchFields() {
            const newMappings = {};
            const usedFields = new Set();
            
            // First pass: exact matches
            this.csvHeaders.forEach(header => {
                for (const field of this.systemFields) {
                    if (usedFields.has(field)) continue;
                    
                    const normalized1 = this.normalizeString(header);
                    const normalized2 = this.normalizeString(field);
                    
                    if (normalized1 === normalized2) {
                        newMappings[header] = field;
                        usedFields.add(field);
                        return;
                    }
                }
            });
            
            // Second pass: variation matches
            this.csvHeaders.forEach(header => {
                if (newMappings[header]) return; // Already matched
                
                let bestMatch = null;
                let bestScore = 0;
                
                for (const field of this.systemFields) {
                    if (usedFields.has(field)) continue;
                    
                    const score = this.getMatchScore(header, field);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMatch = field;
                    }
                }
                
                if (bestMatch && bestScore > 0) {
                    newMappings[header] = bestMatch;
                    usedFields.add(bestMatch);
                }
            });
            
            const matchedCount = Object.keys(newMappings).length;
            const totalFields = this.csvHeaders.length;
            
            // Update mappings and force UI update
            this.$nextTick(() => {
                this.fieldMappings = { ...newMappings };
                
                // Show success message
                if (matchedCount > 0) {
                    this.errorMessage = '';
                    // Create a temporary success message
                    const successMsg = `Automatically matched ${matchedCount} out of ${totalFields} fields`;
                    const messageElement = document.createElement('div');
                    messageElement.className = 'mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-md';
                    messageElement.innerHTML = `
                        <p class="text-green-600 flex items-center">
                            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            ${successMsg}
                        </p>
                    `;
                    
                    // Insert the message before the field mapping section
                    const fieldMappingSection = document.querySelector('[x-show="csvData && !previewData"]');
                    if (fieldMappingSection) {
                        fieldMappingSection.parentNode.insertBefore(messageElement, fieldMappingSection);
                        
                        // Remove the message after 4 seconds
                        setTimeout(() => {
                            if (messageElement.parentNode) {
                                messageElement.parentNode.removeChild(messageElement);
                            }
                        }, 4000);
                    }
                } else {
                    this.errorMessage = 'No automatic matches found. Please map fields manually.';
                }
            });
        },

        // Calculate match score between CSV header and system field
        getMatchScore(header, field) {
            const normalized1 = this.normalizeString(header);
            const normalized2 = this.normalizeString(field);
            
            // Exact match gets highest score
            if (normalized1 === normalized2) {
                return 100;
            }
            
            // Check variations
            const variations = this.fieldVariations[field];
            if (variations) {
                for (const variation of variations) {
                    const normalizedVariation = this.normalizeString(variation);
                    
                    // Exact variation match
                    if (normalizedVariation === normalized1) {
                        return 90;
                    }
                    
                    // Partial matches
                    if (normalized1.includes(normalizedVariation) || normalizedVariation.includes(normalized1)) {
                        const similarity = Math.max(
                            normalizedVariation.length / normalized1.length,
                            normalized1.length / normalizedVariation.length
                        );
                        return Math.floor(similarity * 80);
                    }
                }
            }
            
            // Check if field name is contained in header or vice versa
            if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
                const similarity = Math.max(
                    normalized2.length / normalized1.length,
                    normalized1.length / normalized2.length
                );
                return Math.floor(similarity * 60);
            }
            
            return 0;
        },

        async connectToFabman() {
            if (!this.apiKey) return;
            
            this.isConnecting = true;
            this.errorMessage = '';
            
            try {
                const formattedApiKey = `Bearer ${this.apiKey.trim()}`;
                
                // First load accounts
                const accountsResponse = await fetch(`https://fabman.io/api/v1/accounts`, {
                    headers: {
                        'Authorization': formattedApiKey
                    }
                });

                if (!accountsResponse.ok) {
                    throw new Error('Failed to connect to Fabman. Please check your API key.');
                }

                const accountsData = await accountsResponse.json();
                this.accounts = accountsData;

                // Auto-select account if there's only one
                if (accountsData.length === 1 && !this.accountId) {
                    this.accountId = accountsData[0].id;
                }

                // Then load packages if an account is selected
                if (this.accountId) {
                    const packagesResponse = await fetch(`https://fabman.io/api/v1/packages?account=${this.accountId}`, {
                        headers: {
                            'Authorization': formattedApiKey
                        }
                    });

                    if (!packagesResponse.ok) {
                        throw new Error('Failed to load packages. Please try again.');
                    }

                    const packagesData = await packagesResponse.json();
                    this.packages = packagesData;
                }
            } catch (error) {
                console.error('Error connecting to Fabman:', error);
                this.errorMessage = error.message;
                this.packages = [];
                this.accounts = [];
            } finally {
                this.isConnecting = false;
            }
        },

        // Helper function to check if a CSV row is empty
        isEmptyRow(row) {
            // Check if all values in the row are empty or only whitespace
            return Object.values(row).every(value => 
                !value || (typeof value === 'string' && value.trim() === '')
            );
        },

        handleFileUpload(event) {
            const file = event.target.files[0];
            this.processFile(file);
        },

        handleFileDrop(event) {
            this.isDragging = false;
            const file = event.dataTransfer.files[0];
            this.processFile(file);
        },

        processFile(file) {
            if (!file) return;
            
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                alert('Please upload a CSV file');
                return;
            }

            Papa.parse(file, {
                header: true,
                complete: (results) => {
                    this.csvData = results.data.filter(row => !this.isEmptyRow(row));
                    this.csvHeaders = results.meta.fields;
                    this.fieldMappings = {};
                    this.previewData = null;
                    this.autoMatchFields();
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                    alert('Error parsing CSV file. Please check the file format.');
                }
            });
        },

        generatePreview() {
            if (!this.csvData) return;

            // Reset preview state
            this.showingAllPreviewRows = false;
            
            this.generatePreviewData();
        },

        generatePreviewData() {
            // Find the selected package name
            let selectedPackageData = null;
            if (this.selectedPackage) {
                selectedPackageData = this.packages.find(pkg => {
                    // Handle both string and number comparisons
                    return pkg.id == this.selectedPackage || 
                           pkg.id === parseInt(this.selectedPackage) || 
                           pkg.id.toString() === this.selectedPackage.toString();
                });
            }
            const packageName = selectedPackageData ? selectedPackageData.name : 'No package selected';

            // Determine how many rows to show
            const rowsToShow = this.showingAllPreviewRows ? this.csvData.length : this.previewLimit;

            // Generate preview data
            this.previewData = this.csvData.slice(0, rowsToShow).map(row => {
                const mappedRow = {};
                this.systemFields.forEach(field => {
                    const csvHeader = Object.keys(this.fieldMappings).find(
                        key => this.fieldMappings[key] === field
                    );
                    mappedRow[field] = csvHeader ? row[csvHeader] : '';
                });
                
                // Add package information
                mappedRow.packageName = packageName;
                
                return mappedRow;
            });
        },

        showAllPreviewRows() {
            this.showingAllPreviewRows = true;
            this.generatePreviewData();
        },

        resetApplication() {
            // Reset all data to initial state
            this.apiKey = '';
            this.accountId = '';
            this.csvData = null;
            this.csvHeaders = [];
            this.fieldMappings = {};
            this.previewData = null;
            this.previewLimit = 10;
            this.showingAllPreviewRows = false;
            this.errorMessage = '';
            this.keyType = '';
            this.packages = [];
            this.accounts = [];
            this.selectedPackage = '';
            this.isConnecting = false;
            
            // Reset file input
            const fileInput = document.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.value = '';
            }
        },

        async submitData() {
            this.errorMessage = '';
            
            if (!this.apiKey) {
                this.errorMessage = 'Please enter your Fabman API key';
                return;
            }

            if (!this.accountId) {
                this.errorMessage = 'Please enter your Account ID';
                return;
            }

            if (!this.csvData) {
                this.errorMessage = 'Please upload a CSV file first';
                return;
            }

            if (this.hasKeyMapping && !this.keyType) {
                this.errorMessage = 'Please select a key type';
                return;
            }

            try {
                const formattedApiKey = `Bearer ${this.apiKey.trim()}`;
                const createdMembers = [];
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

                // Process each member one at a time
                for (const row of this.csvData) {
                    // Skip empty rows (defensive programming)
                    if (this.isEmptyRow(row)) {
                        continue;
                    }

                    const memberData = {
                        account: this.accountId
                    };

                    // Only include fields that have been mapped
                    Object.entries(this.fieldMappings).forEach(([csvHeader, systemField]) => {
                        if (systemField !== 'key' && row[csvHeader]) {
                            memberData[systemField] = row[csvHeader];
                        }
                    });

                    // Create member
                    const response = await fetch('https://fabman.io/api/v1/members', {
                        method: 'POST',
                        headers: {
                            'Authorization': formattedApiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(memberData)
                    });

                    if (!response.ok) {
                        const errorData = await response.json().catch(() => null);
                        throw new Error(`Error creating member: ${errorData?.message || response.statusText}`);
                    }

                    const result = await response.json();
                    createdMembers.push(result);

                    // Assign package if one is selected
                    if (this.selectedPackage) {
                        const packageResponse = await fetch(`https://fabman.io/api/v1/members/${result.id}/packages`, {
                            method: 'POST',
                            headers: {
                                'Authorization': formattedApiKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                package: this.selectedPackage,
                                fromDate: today
                            })
                        });

                        if (!packageResponse.ok) {
                            const packageError = await packageResponse.json().catch(() => null);
                            console.error(`Error assigning package for member ${result.id}:`, packageError);
                        }
                    }

                    // Handle key if it exists
                    const keyField = Object.keys(this.fieldMappings).find(
                        key => this.fieldMappings[key] === 'key'
                    );

                    if (keyField && row[keyField]) {
                        const keyResponse = await fetch(`https://fabman.io/api/v1/members/${result.id}/key`, {
                            method: 'POST',
                            headers: {
                                'Authorization': formattedApiKey,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                token: row[keyField],
                                type: this.keyType,
                                state: 'active'
                            })
                        });

                        if (!keyResponse.ok) {
                            const keyError = await keyResponse.json().catch(() => null);
                            console.error(`Error adding key for member ${result.id}:`, keyError);
                        }
                    }
                }

                alert(`Successfully imported ${createdMembers.length} members!`);
                
                // Reset the form
                this.csvData = null;
                this.csvHeaders = [];
                this.fieldMappings = {};
                this.previewData = null;
                this.keyType = '';
                document.querySelector('input[type="file"]').value = '';
            } catch (error) {
                console.error('Error importing data:', error);
                this.errorMessage = error.message;
                alert(this.errorMessage);
            }
        }
    };
}

// Handle external links - open them in the default browser
document.addEventListener('DOMContentLoaded', function() {
    const { shell } = require('electron');
    
    // Handle all external links
    document.addEventListener('click', function(event) {
        const target = event.target.closest('a');
        if (target && target.href) {
            // Check if it's an external link (starts with http/https)
            if (target.href.startsWith('http://') || target.href.startsWith('https://')) {
                event.preventDefault();
                shell.openExternal(target.href);
            }
        }
    });
}); 